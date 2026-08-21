/**
 * I-WORLD NETWORKS — DIGITAL REVENUE HUB AUTOMATION ENGINE v2
 * Author: Reformer Ejembi (Digital & Web Team Lead)
 * Target: ₦1,400,000 / Day | ₦42,000,000 / Month
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('IWN Lead Engine')
    .addItem('0. Bootstrap workbook tabs', 'bootstrapLeadEngineWorkbook')
    .addItem('0. Reset & Reseed 00 Config (7 Reps & Feeds)', 'reseedConfigTab')
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
