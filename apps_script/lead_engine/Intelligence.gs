/**
 * Seasonal weights, source scoreboard, stale recycle, weekly review.
 */

function iwnSeasonalTheme_(month) {
  month = Number(month);
  if (month >= 1 && month <= 3) {
    return {
      osmKey: 'school',
      sector: 'Education',
      contact: 'ICT Director / Principal',
      boost: { OSM: 1.4, JOBS: 1.1, RSS_NEWS: 1, EVENTS: 1.2, GOOGLE_ALERTS: 1 }
    };
  }
  if (month >= 4 && month <= 6) {
    return {
      osmKey: 'hotel',
      sector: 'Hospitality',
      contact: 'General Manager / IT',
      boost: { OSM: 1.4, EVENTS: 1.2, RSS_NEWS: 1.1, JOBS: 1, GOOGLE_ALERTS: 1 }
    };
  }
  if (month >= 7 && month <= 9) {
    return {
      osmKey: 'industry',
      sector: 'Industrial Manufacturing',
      contact: 'Plant / IT Manager',
      boost: { OSM: 1.5, RSS_NEWS: 1.3, JOBS: 1.1, EVENTS: 1, GOOGLE_ALERTS: 1.1 }
    };
  }
  return {
    osmKey: 'office',
    sector: 'Corporate / Finance',
    contact: 'CIO / Branch Manager',
    boost: { OSM: 1.2, RSS_NEWS: 1.2, JOBS: 1.2, EVENTS: 1.1, GOOGLE_ALERTS: 1.3 }
  };
}

function iwnRecordSourcePerf_(distBySource, blockedBySource, harvestedTotal) {
  const today = iwnToday_();
  const sources = {};
  Object.keys(distBySource || {}).forEach(function (k) { sources[k] = true; });
  Object.keys(blockedBySource || {}).forEach(function (k) { sources[k] = true; });
  const keys = Object.keys(sources);
  if (!keys.length) {
    iwnAppend_(iwnSheet_(IWN.SHEETS.SOURCE_PERF), [[
      today, 'ALL', harvestedTotal || 0, 0, 0, 0, 0, 0, 0
    ]]);
    return;
  }
  keys.forEach(function (src) {
    iwnAppend_(iwnSheet_(IWN.SHEETS.SOURCE_PERF), [[
      today,
      src,
      harvestedTotal || 0,
      blockedBySource[src] || 0,
      distBySource[src] || 0,
      0, 0, 0, 0
    ]]);
  });
}

function refreshSourceScoreboard() {
  const pipe = iwnSheet_(IWN.SHEETS.PIPELINE);
  const last = pipe.getLastRow();
  if (last < 2) return;
  const rows = pipe.getRange(2, 1, last - 1, IWN.HEADERS.PIPELINE.length).getValues();
  const stats = {};
  rows.forEach(function (row) {
    const src = row[IWN.PIPE.ADAPTER] || 'Unknown';
    stats[src] = stats[src] || { contacted: 0, meeting: 0, closed: 0, dead: 0 };
    const c = String(row[IWN.PIPE.CLAIMED] || '').toLowerCase();
    if (c === 'contacted') stats[src].contacted++;
    else if (c === 'meeting') stats[src].meeting++;
    else if (c === 'closed') stats[src].closed++;
    else if (c === 'dead') stats[src].dead++;
  });

  const perf = iwnSheet_(IWN.SHEETS.SOURCE_PERF);
  const pLast = perf.getLastRow();
  if (pLast < 2) return;
  const tz = iwnSetting_('TIMEZONE', 'Africa/Lagos');
  const today = iwnToday_();
  const prow = perf.getRange(2, 1, pLast - 1, 9).getValues();
  prow.forEach(function (row, i) {
    const d = row[0] instanceof Date ? Utilities.formatDate(row[0], tz, 'yyyy-MM-dd') : String(row[0]);
    if (d !== today) return;
    const s = stats[row[1]];
    if (!s) return;
    perf.getRange(i + 2, 6, 1, 4).setValues([[s.contacted, s.meeting, s.closed, s.dead]]);
  });
}

function recycleStaleLeads() {
  const staleDays = Number(iwnSetting_('STALE_DAYS', 14));
  const pipe = iwnSheet_(IWN.SHEETS.PIPELINE);
  const last = pipe.getLastRow();
  if (last < 2) return 0;
  const rows = pipe.getRange(2, 1, last - 1, IWN.HEADERS.PIPELINE.length).getValues();
  const reps = iwnGetReps_();
  let moved = 0;
  rows.forEach(function (row, i) {
    const claimed = String(row[IWN.PIPE.CLAIMED] || '').trim();
    if (claimed) return;
    const age = iwnDaysSince_(row[IWN.PIPE.DATE]);
    if (age < staleDays) return;
    const current = row[IWN.PIPE.REP];
    const secondary = reps.filter(function (r) { return r.name !== current; })[0];
    if (!secondary) return;
    pipe.getRange(i + 2, IWN.PIPE.REP + 1).setValue(secondary.name);
    pipe.getRange(i + 2, IWN.PIPE.REASSIGNED + 1).setValue(new Date());
    pipe.getRange(i + 2, IWN.PIPE.STATUS + 1).setValue('Reassigned — unclaimed 14d');
    moved++;
  });
  if (moved) {
    const reformer = String(iwnSetting_('REFORMER_EMAIL', ''));
    if (reformer) {
      GmailApp.sendEmail(reformer, 'IWN stale leads recycled: ' + moved,
        moved + ' unclaimed pipeline leads were reassigned after ' + staleDays + ' days.\n' + iwnSs_().getUrl());
    }
  }
  return moved;
}

function weeklySourceReview() {
  refreshSourceScoreboard();
  const tz = iwnSetting_('TIMEZONE', 'Africa/Lagos');
  const day = Number(Utilities.formatDate(new Date(), tz, 'u'));
  if (day !== 5 && !arguments.length) return;

  const perf = iwnSheet_(IWN.SHEETS.SOURCE_PERF);
  const last = perf.getLastRow();
  let body = 'Weekly Lead Engine review\n\n';
  if (last >= 2) {
    const rows = perf.getRange(2, 1, last - 1, 9).getValues();
    const weekAgo = Date.now() - 7 * 86400000;
    const agg = {};
    rows.forEach(function (row) {
      const d = row[0] instanceof Date ? row[0].getTime() : new Date(row[0]).getTime();
      if (d < weekAgo) return;
      const src = row[1] || 'Unknown';
      agg[src] = agg[src] || { dist: 0, blocked: 0, closed: 0 };
      agg[src].blocked += Number(row[3] || 0);
      agg[src].dist += Number(row[4] || 0);
      agg[src].closed += Number(row[7] || 0);
    });
    Object.keys(agg).forEach(function (src) {
      body += src + ' — distributed ' + agg[src].dist + ', duplicates blocked ' + agg[src].blocked +
        ', closed (tagged) ' + agg[src].closed + '\n';
    });
  }
  const registry = iwnSheet_(IWN.SHEETS.REGISTRY);
  body += '\nRegistry size: ' + Math.max(registry.getLastRow() - 1, 0) + ' unique keys\n';
  body += 'Workbook: ' + iwnSs_().getUrl();
  const to = String(iwnSetting_('REFORMER_EMAIL', ''));
  if (to) GmailApp.sendEmail(to, 'IWN weekly source review', body);
  iwnLogDist_('WEEKLY_REVIEW', to, 0, '', '');
}
