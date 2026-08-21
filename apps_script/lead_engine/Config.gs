/**
 * Read 00 Config: reps, settings, source toggles, RSS URLs, coverage, OSM bboxes.
 */

function iwnSetting_(key, fallback) {
  const map = iwnSettingsMap_();
  if (map[key] === undefined || map[key] === '') return fallback;
  return map[key];
}

function iwnSettingsMap_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('IWN_SETTINGS');
  if (cached) {
    try { return JSON.parse(cached); } catch (e) { /* ignore */ }
  }
  const sheet = iwnSheet_(IWN.SHEETS.CONFIG);
  const values = sheet.getDataRange().getValues();
  const map = {};
  let inSettings = false;
  for (let i = 0; i < values.length; i++) {
    const a = String(values[i][0] || '').trim();
    const b = values[i][1];
    if (a === 'Setting' && String(values[i][1]).trim() === 'Value') {
      inSettings = true;
      continue;
    }
    if (inSettings) {
      if (!a || a === 'SourceId' || a === 'Kind' || a === 'City' || a === 'Name') break;
      map[a] = b;
    }
  }
  cache.put('IWN_SETTINGS', JSON.stringify(map), 120);
  return map;
}

function iwnGetReps_() {
  const sheet = iwnSheet_(IWN.SHEETS.CONFIG);
  const values = sheet.getDataRange().getValues();
  const reps = [];
  let inReps = false;
  for (let i = 0; i < values.length; i++) {
    const a = String(values[i][0] || '').trim();
    if (a === 'Name' && String(values[i][1]).trim() === 'Email') {
      inReps = true;
      continue;
    }
    if (inReps) {
      if (!a || a.indexOf('NOTE:') === 0 || a === 'Setting') break;
      if (values[i][5] === false || String(values[i][5]).toUpperCase() === 'FALSE') continue;
      reps.push({
        name: a,
        email: String(values[i][1] || '').trim(),
        whatsapp: String(values[i][2] || '').trim(),
        territories: String(values[i][3] || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean),
        quota: Number(values[i][4] || iwnSetting_('DAILY_QUOTA_PER_REP', 8))
      });
    }
  }
  return reps;
}

function iwnGetEnabledSources_() {
  const sheet = iwnSheet_(IWN.SHEETS.CONFIG);
  const values = sheet.getDataRange().getValues();
  const sources = {};
  let inSrc = false;
  for (let i = 0; i < values.length; i++) {
    const a = String(values[i][0] || '').trim();
    if (a === 'SourceId' && String(values[i][1]).trim() === 'Enabled') {
      inSrc = true;
      continue;
    }
    if (inSrc) {
      if (!a || a === 'Kind') break;
      sources[a] = {
        enabled: values[i][1] !== false && String(values[i][1]).toUpperCase() !== 'FALSE',
        weight: Number(values[i][2] || 1)
      };
    }
  }
  return sources;
}

function iwnGetFeeds_(kind) {
  const sheet = iwnSheet_(IWN.SHEETS.CONFIG);
  const values = sheet.getDataRange().getValues();
  const feeds = [];
  let inFeeds = false;
  for (let i = 0; i < values.length; i++) {
    const a = String(values[i][0] || '').trim();
    if (a === 'Kind' && String(values[i][1]).trim() === 'Url') {
      inFeeds = true;
      continue;
    }
    if (inFeeds) {
      if (!a || a === 'City') break;
      const enabled = values[i][2] !== false && String(values[i][2]).toUpperCase() !== 'FALSE';
      const url = String(values[i][1] || '').trim();
      if (!enabled || !url || url.indexOf('PASTE_') === 0 || url.indexOf('http') !== 0) continue;
      if (!kind || a === kind) feeds.push({ kind: a, url: url });
    }
  }
  return feeds;
}

function iwnGetCoverageCities_() {
  const sheet = iwnSheet_(IWN.SHEETS.CONFIG);
  const values = sheet.getDataRange().getValues();
  const cities = [];
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === 'City' && String(values[i][1]) === 'State' && String(values[i][3]) === 'FiberCoverage') {
      for (let j = i + 1; j < values.length; j++) {
        if (!values[j][0] || String(values[j][0]) === 'City') break;
        cities.push({
          city: String(values[j][0]),
          state: String(values[j][1]),
          territory: String(values[j][2]),
          fiber: values[j][3] !== false
        });
      }
      break;
    }
  }
  return cities;
}

function iwnGetOsmBboxes_() {
  const sheet = iwnSheet_(IWN.SHEETS.CONFIG);
  const values = sheet.getDataRange().getValues();
  const boxes = [];
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === 'City' && String(values[i][1]) === 'South') {
      for (let j = i + 1; j < values.length; j++) {
        if (!values[j][0] || String(values[j][0]).indexOf('Alert') === 0) break;
        boxes.push({
          city: String(values[j][0]),
          south: Number(values[j][1]),
          west: Number(values[j][2]),
          north: Number(values[j][3]),
          east: Number(values[j][4]),
          state: String(values[j][5])
        });
      }
      break;
    }
  }
  return boxes;
}

function iwnCoverageBoost_(location) {
  const loc = String(location || '').toLowerCase();
  const cities = iwnGetCoverageCities_();
  for (let i = 0; i < cities.length; i++) {
    if (cities[i].fiber && loc.indexOf(cities[i].city.toLowerCase()) !== -1) return true;
    if (loc.indexOf(cities[i].state.toLowerCase()) !== -1) return true;
  }
  return false;
}
