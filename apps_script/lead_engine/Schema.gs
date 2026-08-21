/**
 * IWN Lead Engine v2 — workbook schema, sheet names, and idempotent bootstrap.
 */

var IWN = IWN || {};

IWN.SHEETS = {
  CONFIG: '00 Config',
  RAW: '01 Raw Inbound',
  INBOUND: '02 Inbound Web Leads',
  PIPELINE: '03 Sales Pipeline',
  TRACKER: '04 Daily Revenue Tracker',
  REGISTRY: '05 Lead Registry',
  SOURCE_PERF: '06 Source Performance',
  EVENTS: '07 Events & Opportunities',
  ASSIGNMENTS: '08 Rep Assignments Today',
  DIST_LOG: '09 Distribution Log'
};

IWN.HEADERS = {
  RAW: [
    'Timestamp', 'Company Name', 'Contact Person / Role', 'Email', 'Phone',
    'Location', 'Industry Sector', 'Source', 'Source URL', 'Intent Tag', 'Processed?'
  ],
  INBOUND: [
    'Timestamp', 'Name', 'Email', 'Phone', 'State', 'Internet Type',
    'Address', 'Source', 'Extra', 'Processed?', 'Routed To', 'Lead ID'
  ],
  PIPELINE: [
    'Lead ID', 'Company Name', 'Contact Person', 'Contact Details', 'Assigned Sales Rep',
    'Territory Region', 'Sector', 'Est. MRR (NGN)', 'Status', 'Date Processed',
    'Intent Tag', 'Source URL', 'Maps Link', 'LinkedIn Search', 'Dedup Key',
    'Claimed', 'Claimed At', 'Last Reassigned', 'Source Adapter'
  ],
  REGISTRY: [
    'Dedup Key', 'Company', 'City', 'Sector Bucket', 'First Seen', 'Last Seen',
    'Times Surfaced', 'Distributed', 'Last Lead ID', 'Status'
  ],
  SOURCE_PERF: [
    'Date', 'Source', 'Leads Harvested', 'Duplicates Blocked', 'Leads Distributed',
    'Contacted', 'Meeting', 'Closed', 'Dead'
  ],
  EVENTS: [
    'Event Date', 'Title', 'Location', 'Territory', 'Type', 'Source URL', 'Days Until', 'Notes'
  ],
  ASSIGNMENTS: [
    'Date', 'Rep', 'Lead ID', 'Company', 'Territory', 'Intent', 'Source URL'
  ],
  DIST_LOG: [
    'Timestamp', 'Type', 'Recipient', 'Lead Count', 'Message ID', 'Notes'
  ]
};

IWN.RAW = {
  TS: 0, COMPANY: 1, CONTACT: 2, EMAIL: 3, PHONE: 4, LOCATION: 5,
  SECTOR: 6, SOURCE: 7, SOURCE_URL: 8, INTENT: 9, PROCESSED: 10
};

IWN.PIPE = {
  ID: 0, COMPANY: 1, CONTACT: 2, DETAILS: 3, REP: 4, TERRITORY: 5,
  SECTOR: 6, MRR: 7, STATUS: 8, DATE: 9, INTENT: 10, SOURCE_URL: 11,
  MAPS: 12, LINKEDIN: 13, KEY: 14, CLAIMED: 15, CLAIMED_AT: 16,
  REASSIGNED: 17, ADAPTER: 18
};

IWN.INBOUND = {
  TS: 0, NAME: 1, EMAIL: 2, PHONE: 3, STATE: 4, TYPE: 5,
  ADDRESS: 6, SOURCE: 7, EXTRA: 8, PROCESSED: 9, ROUTED: 10, LEAD_ID: 11
};

/**
 * Create missing tabs, headers, and seed Config if empty.
 * Safe to re-run — never wipes existing lead rows.
 */
function bootstrapLeadEngineWorkbook() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, IWN.SHEETS.CONFIG);
  seedConfigIfEmpty_(ss.getSheetByName(IWN.SHEETS.CONFIG));

  ensureHeaderSheet_(ss, IWN.SHEETS.RAW, IWN.HEADERS.RAW, '#d9ead3');
  ensureHeaderSheet_(ss, IWN.SHEETS.INBOUND, IWN.HEADERS.INBOUND, '#fff2cc');
  ensureHeaderSheet_(ss, IWN.SHEETS.PIPELINE, IWN.HEADERS.PIPELINE, '#c9daf8');
  ensureSheet_(ss, IWN.SHEETS.TRACKER);
  ensureHeaderSheet_(ss, IWN.SHEETS.REGISTRY, IWN.HEADERS.REGISTRY, '#d9d2e9');
  ensureHeaderSheet_(ss, IWN.SHEETS.SOURCE_PERF, IWN.HEADERS.SOURCE_PERF, '#ead1dc');
  ensureHeaderSheet_(ss, IWN.SHEETS.EVENTS, IWN.HEADERS.EVENTS, '#fce5cd');
  ensureHeaderSheet_(ss, IWN.SHEETS.ASSIGNMENTS, IWN.HEADERS.ASSIGNMENTS, '#cfe2f3');
  ensureHeaderSheet_(ss, IWN.SHEETS.DIST_LOG, IWN.HEADERS.DIST_LOG, '#d0e0e3');

  const pipeline = ss.getSheetByName(IWN.SHEETS.PIPELINE);
  const claimedCol = pipeline.getRange(2, IWN.PIPE.CLAIMED + 1, Math.max(pipeline.getMaxRows() - 1, 1), 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['', 'Claimed', 'Contacted', 'Meeting', 'Closed', 'Dead'], true)
    .setAllowInvalid(true)
    .build();
  claimedCol.setDataValidation(rule);

  try {
    SpreadsheetApp.getUi().alert('Lead Engine workbook is ready. Review 00 Config (Jeffrey email + Google Alerts RSS URLs).');
  } catch (e) {
    Logger.log('Workbook bootstrapped');
  }
}

function ensureSheet_(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function ensureHeaderSheet_(ss, name, headers, color) {
  const sheet = ensureSheet_(ss, name);
  const first = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const empty = first.every(function (cell) { return cell === ''; });
  if (empty) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold')
      .setBackground(color);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
}

function reseedConfigTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(IWN.SHEETS.CONFIG) || ss.insertSheet(IWN.SHEETS.CONFIG);
  sheet.clear();
  seedConfigContent_(sheet);
  try {
    SpreadsheetApp.getUi().alert('00 Config has been reseeded with all 7 sales reps and active Google Alert RSS feeds!');
  } catch (e) {
    Logger.log('00 Config reseeded');
  }
}

function seedConfigIfEmpty_(sheet) {
  if (sheet.getLastRow() > 2) return;
  seedConfigContent_(sheet);
}

function seedConfigContent_(sheet) {
  sheet.clear();
  sheet.getRange('A1:F1').merge().setValue('IWN LEAD ENGINE — CONFIG')
    .setFontWeight('bold').setFontSize(13).setBackground('#1c4587').setFontColor('#ffffff');

  sheet.getRange('A3:F3').setValues([['Name', 'Email', 'WhatsApp', 'Territories', 'DailyQuota', 'Active']])
    .setFontWeight('bold').setBackground('#d9ead3');
  sheet.getRange('A4:F10').setValues([
    ['Titilade Bakare', 'titilade.bakare@iworldnetworks.net', '08131529077', 'Ogun,Abeokuta,Lagos', 8, true],
    ['Emmanuel Oladimeji', 'emmanuel.oladimeji@iworldnetworks.net', '08036265524', 'Osun,Osogbo,Ilesa', 8, true],
    ['Janet Oke', 'janet.oke@iworldnetworks.net', '07066053380', 'Sagamu,Ijebu,Mowe,Ibafo', 8, true],
    ['Ruth Suleimon', 'ruth.suleimon@iworldnetworks.net', '08165106653', 'Ondo,Akure', 8, true],
    ['Henry Adiene', 'henry.adiene@iworldnetworks.net', '09051118661', 'Ogun,Abeokuta,Ota,Agbara', 8, true],
    ['Elizabeth Tola', 'elizabeth.tola@iworldnetworks.net', '08130778963', 'Osun,Osogbo', 8, true],
    ['Jeffery Udoji', 'jeffery.udoji@iworldnetworks.net', '08130589466', 'Oyo,Ibadan,Enterprise,Overflow', 8, true]
  ]);

  sheet.getRange('A12:B12').setValues([['Setting', 'Value']]).setFontWeight('bold').setBackground('#c9daf8');
  sheet.getRange('A13:B24').setValues([
    ['DAILY_QUOTA_PER_REP', 8],
    ['DEDUP_WINDOW_DAYS', 90],
    ['STALE_DAYS', 14],
    ['CSE_API_KEY', ''],
    ['CSE_CX', ''],
    ['JUDE_EMAIL', 'jude.alawode@iworldnetworks.net'],
    ['REFORMER_EMAIL', 'reformer.ejembi@iworldnetworks.net'],
    ['TIMEZONE', 'Africa/Lagos'],
    ['DEFAULT_MRR', 450000],
    ['JEFFREY_EMAIL_UNCONFIRMED', false],
    ['WEBHOOK_SECRET', ''],
    ['MAX_ENRICH_LOOKUPS_PER_RUN', 20]
  ]);

  sheet.getRange('A26:C26').setValues([['SourceId', 'Enabled', 'Weight']]).setFontWeight('bold').setBackground('#fff2cc');
  sheet.getRange('A27:C31').setValues([
    ['OSM', true, 1],
    ['RSS_NEWS', true, 1],
    ['GOOGLE_ALERTS', true, 1],
    ['JOBS', true, 1],
    ['EVENTS', true, 1]
  ]);

  sheet.getRange('A33:C33').setValues([['Kind', 'Url', 'Enabled']]).setFontWeight('bold').setBackground('#fce5cd');
  sheet.getRange('A34:C47').setValues([
    ['NEWS', 'https://nairametrics.com/feed/', true],
    ['NEWS', 'https://businessday.ng/feed/', true],
    ['NEWS', 'https://www.vanguardngr.com/category/business/feed/', true],
    ['NEWS', 'https://guardian.ng/category/business/feed/', true],
    ['NEWS', 'https://news.google.com/rss/search?q=when:7d+(opens+OR+launches+OR+expands+OR+inaugurates)+(Ogun+OR+Oyo+OR+Osun+OR+Ondo+OR+Ibadan+OR+Abeokuta+OR+Osogbo+OR+Akure+OR+Sagamu)+Nigeria&hl=en-NG&gl=NG&ceid=NG:en', true],
    ['ALERT', 'https://www.google.com/alerts/feeds/12297025400238690137/3867597671381344390', true],
    ['ALERT', 'https://www.google.com/alerts/feeds/12297025400238690137/866410008320019932', true],
    ['ALERT', 'https://www.google.com/alerts/feeds/12297025400238690137/1582609086405365807', true],
    ['ALERT', 'https://www.google.com/alerts/feeds/12297025400238690137/4137895255443332902', true],
    ['ALERT', 'https://www.google.com/alerts/feeds/12297025400238690137/12264079732288377955', true],
    ['ALERT', 'https://www.google.com/alerts/feeds/12297025400238690137/15483584678329363163', true],
    ['ALERT', 'https://www.google.com/alerts/feeds/12297025400238690137/15398313261737478437', true],
    ['JOBS', 'https://news.google.com/rss/search?q=when:7d+("IT+Manager"+OR+"Network+Engineer"+OR+"Systems+Admin"+OR+"Head+of+IT")+(Ogun+OR+Ibadan+OR+Osogbo+OR+Akure+OR+Abeokuta+OR+Lagos)&hl=en-NG&gl=NG&ceid=NG:en', true],
    ['EVENTS', 'https://news.google.com/rss/search?q=when:14d+("trade+fair"+OR+expo+OR+"chamber+of+commerce"+OR+tender+OR+procurement)+(Ogun+OR+Oyo+OR+Osun+OR+Ondo+OR+Ibadan)&hl=en-NG&gl=NG&ceid=NG:en', true]
  ]);

  sheet.getRange('A49:D49').setValues([['City', 'State', 'Territory', 'FiberCoverage']]).setFontWeight('bold').setBackground('#d9ead3');
  sheet.getRange('A50:D57').setValues([
    ['Ibadan', 'Oyo', 'Oyo', true],
    ['Abeokuta', 'Ogun', 'Ogun', true],
    ['Osogbo', 'Osun', 'Osun', true],
    ['Akure', 'Ondo', 'Ondo', true],
    ['Sagamu', 'Ogun', 'Sagamu', true],
    ['Ijebu-Ode', 'Ogun', 'Ijebu', true],
    ['Mowe', 'Ogun', 'Mowe', true],
    ['Lagos', 'Lagos', 'Lagos', true]
  ]);

  sheet.getRange('A59:F59').setValues([['City', 'South', 'West', 'North', 'East', 'State']]).setFontWeight('bold').setBackground('#cfe2f3');
  sheet.getRange('A60:F66').setValues([
    ['Ibadan', 7.32, 3.80, 7.52, 4.05, 'Oyo'],
    ['Abeokuta', 7.10, 3.28, 7.22, 3.45, 'Ogun'],
    ['Osogbo', 7.72, 4.50, 7.82, 4.62, 'Osun'],
    ['Akure', 7.20, 5.14, 7.32, 5.28, 'Ondo'],
    ['Sagamu', 6.80, 3.60, 6.90, 3.72, 'Ogun'],
    ['Ijebu-Ode', 6.78, 3.88, 6.86, 3.98, 'Ogun'],
    ['Lagos', 6.43, 3.30, 6.62, 3.48, 'Lagos']
  ]);

  sheet.getRange('A68:B68').setValues([['Alert Template (create at google.com/alerts, paste RSS into Kind=ALERT rows)', '']])
    .setFontWeight('bold');
  sheet.getRange('A69:A75').setValues([
    ['"new hotel" (Ogun OR Oyo OR Osun OR Ondo OR Lagos OR Ibadan OR Abeokuta OR Osogbo OR Akure OR Sagamu OR "Ijebu Ode" OR Mowe OR Ibafo OR Agbara OR Ota)'],
    ['("factory" OR "plant" OR "warehouse" OR "manufacturing") (Ogun OR Oyo OR Osun OR Ondo OR Lagos OR Ibadan OR Abeokuta OR Osogbo OR Akure OR Sagamu OR "Ijebu Ode" OR Mowe OR Ibafo OR Agbara OR Ota)'],
    ['("school" OR "university" OR "college" OR "polytechnic") ("smart classroom" OR internet OR "Google Workspace" OR "e-learning") (Ogun OR Oyo OR Osun OR Ondo OR Lagos OR Ibadan OR Abeokuta OR Osogbo OR Akure OR Sagamu OR "Ijebu Ode" OR Mowe OR Ibafo OR Agbara OR Ota)'],
    ['("hospital" OR "medical center" OR "clinic" OR "diagnostic") (Ogun OR Oyo OR Osun OR Ondo OR Lagos OR Ibadan OR Abeokuta OR Osogbo OR Akure OR Sagamu OR "Ijebu Ode" OR Mowe OR Ibafo OR Agbara OR Ota)'],
    ['("procurement" OR "tender" OR "RFQ" OR "expression of interest") ("internet" OR "fiber" OR "network infrastructure" OR "bandwidth") (Ogun OR Oyo OR Osun OR Ondo OR Lagos OR Ibadan OR Abeokuta OR Osogbo OR Akure OR Sagamu OR "Ijebu Ode" OR Mowe OR Ibafo OR Agbara OR Ota)'],
    ['("Google Workspace" OR "Microsoft 365" OR "managed IT" OR "cloud hosting" OR "metro fiber") (Ogun OR Oyo OR Osun OR Ondo OR Lagos OR Ibadan OR Abeokuta OR Osogbo OR Akure OR Sagamu OR "Ijebu Ode" OR Mowe OR Ibafo OR Agbara OR Ota)'],
    ['("slow internet" OR "poor network" OR Spectranet OR "MTN business" OR "Airtel business" OR "Glo business") (Ogun OR Oyo OR Osun OR Ondo OR Lagos OR Ibadan OR Abeokuta OR Osogbo OR Akure OR Sagamu OR "Ijebu Ode" OR Mowe OR Ibafo OR Agbara OR Ota)']
  ]);

  sheet.setColumnWidth(1, 280);
  sheet.setColumnWidth(2, 380);
}
