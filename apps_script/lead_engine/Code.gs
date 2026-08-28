/**
 * I-WORLD NETWORKS — DIGITAL REVENUE HUB AUTOMATION ENGINE v2
 * Author: Reformer Ejembi (Digital & Web Team Lead)
 * Target: ₦1,400,000 / Day | ₦42,000,000 / Month
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('IWN Lead Engine')
    .addSeparator()
    .addItem('⚠️  CLEAR all rubbish leads (fresh start)', 'clearAllLeadData')
    .addSeparator()
    .addItem('0. Bootstrap workbook tabs', 'bootstrapLeadEngineWorkbook')
    .addItem('0. Reset & Reseed 00 Config (7 Reps & Feeds)', 'reseedConfigTab')
    .addItem('⚙️ Configure API Keys (Places / Gemini / Apollo)', 'setupApiKeysModal')
    .addItem('🔍 Test Google Places Live Harvest', 'testGooglePlacesHarvest')
    .addItem('1. Harvest leads (all sources)', 'dailyLeadHarvest')
    .addItem('2. Process unprocessed raw leads', 'processRawInboundLeads')
    .addItem('3. Update daily revenue tracker', 'updateDailyTrackerMetrics')
    .addItem('4. Send daily report to Jude', 'sendDailyReportEmail')
    .addItem('5. Send today\'s digests to reps', 'sendRepDailyDigests')
    .addItem('6. Process inbound web queue', 'processInboundWebhookQueue')
    .addItem('7. Recycle stale unclaimed leads', 'recycleStaleLeads')
    .addItem('8. Weekly source review email', 'weeklySourceReview')
    .addItem('9. Install weekday triggers', 'installLeadEngineTriggers')
    .addItem('Add manual lead (sidebar)', 'showManualLeadSidebar')
    .addToUi();
}

/**
 * Clear all rubbish leads and data from previous runs.
 * Keeps all sheet tabs and headers intact — only deletes DATA rows.
 * Also resets the lead ID counter and dedup registry.
 */
function clearAllLeadData() {
  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    '⚠️ Clear All Lead Data',
    'This will DELETE all rows from:\n' +
    '  • 01 Raw Inbound\n' +
    '  • 02 Inbound Web Leads\n' +
    '  • 03 Sales Pipeline\n' +
    '  • 05 Lead Registry\n' +
    '  • 06 Source Performance\n' +
    '  • 08 Rep Assignments Today\n' +
    '  • 09 Distribution Log\n\n' +
    'Headers are kept. This cannot be undone.\n\nProceed?',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) {
    ui.alert('Cancelled — no data was deleted.');
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetsToWipe = [
    IWN.SHEETS.RAW,          // 01 Raw Inbound
    IWN.SHEETS.INBOUND,      // 02 Inbound Web Leads
    IWN.SHEETS.PIPELINE,     // 03 Sales Pipeline
    IWN.SHEETS.REGISTRY,     // 05 Lead Registry
    IWN.SHEETS.SOURCE_PERF,  // 06 Source Performance
    IWN.SHEETS.ASSIGNMENTS,  // 08 Rep Assignments Today
    IWN.SHEETS.DIST_LOG      // 09 Distribution Log
  ];

  let cleared = 0;
  sheetsToWipe.forEach(function (name) {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    const last = sheet.getLastRow();
    if (last > 1) {
      sheet.deleteRows(2, last - 1);
      cleared++;
    }
  });

  // Reset the lead ID counter in 00 Config
  const config = ss.getSheetByName(IWN.SHEETS.CONFIG);
  if (config) {
    const last = config.getLastRow();
    for (let r = 2; r <= last; r++) {
      const key = String(config.getRange(r, 1).getValue());
      if (key === 'LAST_LEAD_ID') {
        config.getRange(r, 2).setValue(1000);
        break;
      }
    }
  }

  // Clear Apps Script cache (dedup registry)
  try { CacheService.getScriptCache().removeAll(['IWN_REGISTRY']); } catch (e) {}

  ui.alert(
    '✅ Done! All rubbish leads cleared.',
    cleared + ' sheet(s) wiped clean.\n\n' +
    'Run IWN Lead Engine > 1. Harvest leads (all sources) to start fresh with real named company targets.',
    ui.ButtonSet.OK
  );
}

function installLeadEngineTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    const fn = t.getHandlerFunction();
    if (/^(dailyLeadHarvest|assignAndWritePipelineMorning|sendRepDailyDigests|sendDailyReportEmail|processInboundWebhookQueue|weeklySourceReview|recycleStaleLeads)$/.test(fn)) {
      ScriptApp.deleteTrigger(t);
    }
  });

  const tz = String(iwnSetting_('TIMEZONE', 'Africa/Lagos'));
  ScriptApp.newTrigger('dailyLeadHarvest').timeBased().everyDays(1).atHour(6).inTimezone(tz).create();
  ScriptApp.newTrigger('sendRepDailyDigests').timeBased().everyDays(1).atHour(7).nearMinute(30).inTimezone(tz).create();
  ScriptApp.newTrigger('sendDailyReportEmail').timeBased().everyDays(1).atHour(7).nearMinute(35).inTimezone(tz).create();
  ScriptApp.newTrigger('processInboundWebhookQueue').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('weeklySourceReview').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(17).inTimezone(tz).create();
  ScriptApp.newTrigger('recycleStaleLeads').timeBased().everyDays(1).atHour(18).inTimezone(tz).create();

  SpreadsheetApp.getUi().alert('Weekday/daily triggers installed (Africa/Lagos). Harvest skips weekends automatically.');
}

function showManualLeadSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('ManualLead')
    .setTitle('Add Manual Lead')
    .setWidth(320);
  SpreadsheetApp.getUi().showSidebar(html);
}

function submitManualLead(payload) {
  bootstrapIfNeeded_();
  const lead = {
    company: payload.company,
    contact: payload.contact || 'Field discovery',
    email: payload.email || '',
    phone: payload.phone || '',
    location: payload.location || '',
    sector: payload.sector || 'Corporate / Industrial',
    source: 'MANUAL',
    sourceUrl: payload.sourceUrl || '',
    intentTag: 'New Business',
    discoveredAt: new Date()
  };
  iwnAppend_(iwnSheet_(IWN.SHEETS.RAW), [[
    new Date(), lead.company, lead.contact, lead.email, lead.phone,
    lead.location, lead.sector, lead.source, lead.sourceUrl, lead.intentTag, ''
  ]]);
  processRawInboundLeads();
  return 'Saved ' + lead.company;
}

function assignAndWritePipelineMorning() {
  processRawInboundLeads();
}

function testGooglePlacesHarvest() {
  const ui = SpreadsheetApp.getUi();
  ui.alert('Testing Google Places Live Harvest...\nPlease wait a few seconds.');
  const leads = googlePlacesFetchLeads_(10);
  if (!leads || !leads.length) {
    ui.alert(
      'Google Places Harvest Test',
      'No leads returned. Check if the Places API key is enabled in Google Cloud Console with billing and Text Search enabled.',
      ui.ButtonSet.OK
    );
    return;
  }

  const sample = leads.slice(0, 3).map(function(l, i) {
    return (i + 1) + '. ' + l.company + '\n   📍 ' + l.location + '\n   📞 ' + (l.phone || 'N/A') + '\n   🌐 ' + (l.sourceUrl || 'N/A');
  }).join('\n\n');

  ui.alert(
    '✅ Google Places Live Harvest Success!',
    'Fetched ' + leads.length + ' fresh operational business leads!\n\nSample leads:\n\n' + sample,
    ui.ButtonSet.OK
  );
}

function setupApiKeysModal() {
  const ui = SpreadsheetApp.getUi();
  const currentKey = iwnGetPlacesApiKey_();
  const res = ui.prompt(
    '⚙️ Configure Google Places API Key',
    'Enter your Google Places API Key below (stored securely in ScriptProperties):\n\nCurrent Key: ' + (currentKey ? currentKey.substring(0, 10) + '...' : 'Not set'),
    ui.ButtonSet.OK_CANCEL
  );

  if (res.getSelectedButton() === ui.Button.OK) {
    const key = res.getResponseText().trim();
    if (key) {
      iwnSaveApiKeys_(key);
      ui.alert('✅ Google Places API Key saved successfully to ScriptProperties!');
    }
  }
}

