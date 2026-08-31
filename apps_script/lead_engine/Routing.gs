/**
 * Territory routing aligned with Assets/forms/form-validation.php sales map.
 * Titilade: Abeokuta (Ogun)
 * Emmanuel: Osun, Ondo
 * Janet: Ota, Agbara, Sagamu, Ijebu, Mowe, Ibafo
 * Jeffrey: overflow / enterprise nationwide
 * EXCLUDED: Lagos — IWN does not operate in Lagos. Lagos leads are dropped.
 */

function iwnTerritoryFromLocation_(location) {
  const loc = String(location || '');
  // Hard block — IWN does not operate in Lagos
  if (/lagos|ikoyi|ikeja|lekki|victoria island|ajah|surulere|yaba/i.test(loc)) return null;
  if (/akure|ondo/i.test(loc)) return { territory: 'Ondo', region: 'Akure/Ondo' };
  if (/osogbo|osun|ilesa/i.test(loc)) return { territory: 'Osun', region: 'Osun Region' };
  if (/ota|agbara/i.test(loc)) return { territory: 'Ota', region: 'Ota/Agbara' };
  if (/sagamu/i.test(loc)) return { territory: 'Sagamu', region: 'Sagamu/Ijebu' };
  if (/ijebu/i.test(loc)) return { territory: 'Ijebu', region: 'Sagamu/Ijebu' };
  if (/mowe|ibafo/i.test(loc)) return { territory: 'Mowe', region: 'Mowe/Ibafo' };
  if (/ibadan|oyo/i.test(loc)) return { territory: 'Oyo', region: 'Oyo Region' };
  if (/abeokuta|ogun/i.test(loc)) return { territory: 'Abeokuta', region: 'Abeokuta/Ogun' };
  return { territory: 'Ogun', region: 'Ogun Region' };
}

/** Convenience wrapper — returns just the region string. */
function iwnExtractRegion_(location) {
  return iwnTerritoryFromLocation_(location).region;
}

function iwnMapStateKey_(state) {
  const s = String(state || '').toLowerCase();
  // Hard block — Lagos is out of service area
  if (s.indexOf('lagos') !== -1 || s.indexOf('ikeja') !== -1 || s.indexOf('lekki') !== -1) return null;
  if (s.indexOf('oyo') !== -1 || s.indexOf('ibadan') !== -1) return 'Oyo';
  if (s.indexOf('osun') !== -1 || s.indexOf('osogbo') !== -1 || s.indexOf('ilesa') !== -1) return 'Osun';
  if (s.indexOf('ondo') !== -1 || s.indexOf('akure') !== -1) return 'Ondo';
  if (s.indexOf('ota') !== -1 || s.indexOf('agbara') !== -1) return 'Ota';
  if (s.indexOf('sagamu') !== -1) return 'Sagamu';
  if (s.indexOf('ijebu') !== -1) return 'Ijebu';
  if (s.indexOf('mowe') !== -1 || s.indexOf('ibafo') !== -1) return 'Mowe';
  if (s.indexOf('ogun') !== -1 || s.indexOf('abeokuta') !== -1) return 'Abeokuta';
  return String(state || 'Abeokuta');
}

function iwnRepsForTerritory_(territory) {
  const reps = iwnGetReps_();
  const t = String(territory || '');
  const matched = reps.filter(function (r) {
    return r.territories.some(function (rt) {
      return t.toLowerCase().indexOf(rt.toLowerCase()) !== -1 ||
        rt.toLowerCase().indexOf(t.toLowerCase()) !== -1;
    });
  });
  if (matched.length) return matched;
  const overflow = reps.filter(function (r) {
    return r.territories.some(function (rt) {
      return /overflow|enterprise/i.test(rt);
    });
  });
  return overflow.length ? overflow : reps;
}

function iwnAssignRep_(lead, counts) {
  const info = iwnTerritoryFromLocation_(lead.location);
  const pool = iwnRepsForTerritory_(info.territory);
  const quota = Number(iwnSetting_('DAILY_QUOTA_PER_REP', 8));
  let chosen = null;
  let best = 1e9;
  pool.forEach(function (rep) {
    const used = counts[rep.name] || 0;
    if (used < Math.min(rep.quota || quota, quota) && used < best) {
      best = used;
      chosen = rep;
    }
  });
  if (!chosen) {
    const overflow = iwnGetReps_().filter(function (r) {
      return r.territories.some(function (rt) { return /overflow|enterprise/i.test(rt); });
    })[0];
    chosen = overflow || pool[0] || iwnGetReps_()[0];
  }
  counts[chosen.name] = (counts[chosen.name] || 0) + 1;
  return { rep: chosen, territory: info.territory, region: info.region };
}
