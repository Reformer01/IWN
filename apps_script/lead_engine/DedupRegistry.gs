/**
 * Master dedup ledger — 90-day window, SHA-256 of normalized company|city|sector.
 */

function iwnNormalizeCompany_(name) {
  return String(name || '').toLowerCase()
    .replace(/\b(ltd|limited|plc|nigeria|nig|inc|llc|company|co|the)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function iwnExtractCity_(location) {
  const loc = String(location || '');
  const cities = ['ibadan', 'abeokuta', 'osogbo', 'akure', 'sagamu', 'ijebu', 'mowe', 'ibafo',
    'lagos', 'ota', 'agbara', 'ilesa', 'ondo', 'osun', 'ogun', 'oyo'];
  const lower = loc.toLowerCase();
  for (let i = 0; i < cities.length; i++) {
    if (lower.indexOf(cities[i]) !== -1) return cities[i];
  }
  return iwnNormalizeCompany_(loc.split(',')[0] || loc).split(' ')[0] || 'unknown';
}

function iwnSectorBucket_(sector) {
  const s = String(sector || '').toLowerCase();
  if (/hotel|hospitality|guest|lodge/.test(s)) return 'hospitality';
  if (/school|edu|university|ngfep|college/.test(s)) return 'education';
  if (/hospital|clinic|health|pharma/.test(s)) return 'healthcare';
  if (/factory|manufactur|industrial|plant|warehouse/.test(s)) return 'industrial';
  if (/bank|finance|fintech/.test(s)) return 'finance';
  if (/gov|ministry|local government/.test(s)) return 'government';
  if (/estate|campus|hotel wifi/.test(s)) return 'campus';
  if (/retail|sme|office/.test(s)) return 'corporate';
  return 'corporate';
}

function iwnDedupKey_(company, location, sector) {
  const raw = iwnNormalizeCompany_(company) + '|' + iwnExtractCity_(location) + '|' + iwnSectorBucket_(sector);
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return bytes.map(function (b) {
    const v = b < 0 ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function iwnLoadRegistry_() {
  const sheet = iwnSheet_(IWN.SHEETS.REGISTRY);
  const last = sheet.getLastRow();
  const map = {};
  if (last < 2) return { map: map, sheet: sheet };
  const rows = sheet.getRange(2, 1, last - 1, IWN.HEADERS.REGISTRY.length).getValues();
  rows.forEach(function (row, idx) {
    if (!row[0]) return;
    map[row[0]] = {
      rowIndex: idx + 2,
      key: row[0],
      company: row[1],
      city: row[2],
      bucket: row[3],
      firstSeen: row[4],
      lastSeen: row[5],
      times: Number(row[6] || 1),
      distributed: row[7] === true || String(row[7]).toUpperCase() === 'TRUE',
      lastLeadId: row[8],
      status: row[9]
    };
  });
  return { map: map, sheet: sheet };
}

function iwnDaysSince_(value) {
  if (!value) return 9999;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return 9999;
  return (Date.now() - d.getTime()) / 86400000;
}

/**
 * Returns { accept, reemerged, key }
 * Duplicate within window → accept=false
 */
function iwnRegistryCheck_(registry, lead) {
  const windowDays = Number(iwnSetting_('DEDUP_WINDOW_DAYS', 90));
  const key = iwnDedupKey_(lead.company, lead.location, lead.sector);
  const existing = registry.map[key];
  if (!existing) {
    return { accept: true, reemerged: false, key: key, existing: null };
  }
  const age = iwnDaysSince_(existing.lastSeen || existing.firstSeen);
  if (age < windowDays) {
    return { accept: false, reemerged: false, key: key, existing: existing };
  }
  return { accept: true, reemerged: true, key: key, existing: existing };
}

function iwnRegistryRecord_(registry, lead, key, leadId, acceptedNew) {
  const city = iwnExtractCity_(lead.location);
  const bucket = iwnSectorBucket_(lead.sector);
  const now = new Date();
  if (acceptedNew && !registry.map[key]) {
    iwnAppend_(registry.sheet, [[
      key, lead.company, city, bucket, now, now, 1, true, leadId, 'Distributed'
    ]]);
    registry.map[key] = {
      key: key, company: lead.company, firstSeen: now, lastSeen: now,
      times: 1, distributed: true, lastLeadId: leadId
    };
  } else if (registry.map[key]) {
    const rec = registry.map[key];
    rec.times = (rec.times || 1) + 1;
    rec.lastSeen = now;
    rec.distributed = true;
    rec.lastLeadId = leadId;
    if (rec.rowIndex) {
      registry.sheet.getRange(rec.rowIndex, 6, 1, 5).setValues([[
        now, rec.times, true, leadId, rec.reemerged ? 'Re-emerged' : 'Distributed'
      ]]);
    }
  }
}

function iwnRegistryMarkBlocked_(registry, key) {
  const rec = registry.map[key];
  if (!rec || !rec.rowIndex) return;
  rec.times = (rec.times || 1) + 1;
  registry.sheet.getRange(rec.rowIndex, 6, 1, 2).setValues([[new Date(), rec.times]]);
}
