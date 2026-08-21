/**
 * Personalized weekday digests to sales reps + Jude/Reformer summary.
 */

function sendRepDailyDigests() {
  bootstrapIfNeeded_();
  if (!iwnIsWeekday_()) return;

  const tz = iwnSetting_('TIMEZONE', 'Africa/Lagos');
  const today = iwnToday_();
  const sheet = iwnSheet_(IWN.SHEETS.ASSIGNMENTS);
  const last = sheet.getLastRow();
  if (last < 2) {
    Logger.log('No assignments to email');
    return;
  }

  const pipeline = iwnLoadPipelineById_();
  const rows = sheet.getRange(2, 1, last - 1, IWN.HEADERS.ASSIGNMENTS.length).getValues();
  const byRep = {};
  rows.forEach(function (row) {
    const d = row[0] instanceof Date ? Utilities.formatDate(row[0], tz, 'yyyy-MM-dd') : String(row[0]);
    if (d !== today) return;
    const name = row[1];
    byRep[name] = byRep[name] || [];
    byRep[name].push({
      leadId: row[2],
      company: row[3],
      territory: row[4],
      intent: row[5],
      sourceUrl: row[6],
      pipe: pipeline[row[2]]
    });
  });

  const reps = iwnGetReps_();
  reps.forEach(function (rep) {
    const leads = byRep[rep.name] || [];
    if (!leads.length || !rep.email) return;
    if (iwnAlreadySentToday_('DIGEST', rep.email)) return;

    const cards = leads.map(function (item) {
      const p = item.pipe || {};
      const wa = rep.whatsapp
        ? ('https://wa.me/' + String(rep.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent('Hi, following up from I-World Networks regarding ' + item.company))
        : '';
      return [
        item.leadId + ' | ' + item.company + ' | ' + (item.territory || ''),
        'Sector: ' + (p.sector || '') + ' | Intent: ' + (item.intent || ''),
        'Contact: ' + (p.details || 'TBD'),
        'Source: ' + (item.sourceUrl || p.sourceUrl || ''),
        'Maps: ' + (p.maps || ''),
        'LinkedIn: ' + (p.linkedin || ''),
        'Suggested pitch: ' + iwnSuggestedPitch_(p.sector, item.intent),
        wa ? ('WhatsApp: ' + wa) : ''
      ].filter(Boolean).join('\n');
    }).join('\n\n');

    const subject = 'IWN daily leads — ' + leads.length + ' accounts — ' +
      Utilities.formatDate(new Date(), tz, 'MMM dd, yyyy');
    const body = 'Good morning ' + rep.name + ',\n\n' +
      'Here are your fresh raw leads for today. These are not prequalified — quality raw accounts for outreach.\n\n' +
      cards + '\n\n' +
      'Mark Claimed / Contacted / Meeting / Closed / Dead in column P of 03 Sales Pipeline.\n' +
      'Workbook: ' + iwnSs_().getUrl() + '\n\n' +
      'Reformer Ejembi\nDigital & Web Team Lead\nI-World Networks Limited';

    GmailApp.sendEmail(rep.email, subject, body);
    iwnLogDist_('DIGEST', rep.email, leads.length, '', today);
  });
}

function sendDailyReportEmail() {
  bootstrapIfNeeded_();
  updateDailyTrackerMetrics();
  const ss = iwnSs_();
  const tracker = iwnSheet_(IWN.SHEETS.TRACKER);
  const tz = ss.getSpreadsheetTimeZone();
  const dateLabel = Utilities.formatDate(new Date(), tz, 'MMM dd, yyyy');
  const recipient = String(iwnSetting_('JUDE_EMAIL', 'jude.alawode@iworldnetworks.net'));
  const cc = String(iwnSetting_('REFORMER_EMAIL', 'reformer.ejembi@iworldnetworks.net'));

  const dailyTarget = tracker.getRange('B5').getDisplayValue();
  const dailyActual = tracker.getRange('C5').getDisplayValue();
  const dailyVariance = tracker.getRange('D5').getDisplayValue();
  const monthlyTarget = tracker.getRange('B6').getDisplayValue();
  const monthlyActual = tracker.getRange('C6').getDisplayValue();
  const pipelineCount = tracker.getRange('C7').getDisplayValue();
  const pipelineMRR = tracker.getRange('C8').getDisplayValue();

  const breakdown = iwnSourceBreakdownToday_();
  const spreadsheetId = ss.getId();
  const sheetId = tracker.getSheetId();
  const singleSheetUrl = ss.getUrl() + '#gid=' + sheetId;
  const pdfExportUrl = 'https://docs.google.com/spreadsheets/d/' + spreadsheetId +
    '/export?format=pdf&gid=' + sheetId + '&portrait=false&size=A4&fitw=true';

  const subject = 'Daily Revenue & Activity Report — ' + dateLabel;
  const body = 'Dear Mr. Jude,\n\n' +
    'Please find the daily Lead Engine + revenue tracker summary for ' + dateLabel + '.\n\n' +
    'REVENUE PERFORMANCE & PIPELINE TRACKING\n' +
    '--------------------------------------------------\n' +
    '- Daily Revenue Target: ' + dailyTarget + '\n' +
    '- Daily Revenue Closed Today: ' + dailyActual + ' (Variance: ' + dailyVariance + ')\n' +
    '- Monthly Revenue Target: ' + monthlyTarget + '\n' +
    '- MTD Revenue Closed: ' + monthlyActual + '\n' +
    '- Qualified Pipeline Leads: ' + pipelineCount + '\n' +
    '- Total Pipeline MRR Value: ' + pipelineMRR + '\n\n' +
    'TODAY\'S LEAD ENGINE (BY SOURCE)\n' +
    breakdown + '\n\n' +
    'DIRECT SHEET LINKS:\n' +
    '- Open Revenue Tracker: ' + singleSheetUrl + '\n' +
    '- Download PDF (Tracker Only): ' + pdfExportUrl + '\n\n' +
    'Best regards,\n\nReformer Ejembi\nDigital & Web Team Lead\nI-World Networks Limited';

  GmailApp.sendEmail(recipient, subject, body, { cc: cc });
  try { SpreadsheetApp.getUi().alert('Daily report emailed to ' + recipient); } catch (e) {}
  iwnLogDist_('JUDE_REPORT', recipient, 0, '', dateLabel);
}

function iwnLoadPipelineById_() {
  const sheet = iwnSheet_(IWN.SHEETS.PIPELINE);
  const last = sheet.getLastRow();
  const map = {};
  if (last < 2) return map;
  const rows = sheet.getRange(2, 1, last - 1, IWN.HEADERS.PIPELINE.length).getValues();
  rows.forEach(function (row) {
    map[row[IWN.PIPE.ID]] = {
      sector: row[IWN.PIPE.SECTOR],
      details: row[IWN.PIPE.DETAILS],
      maps: row[IWN.PIPE.MAPS],
      linkedin: row[IWN.PIPE.LINKEDIN],
      sourceUrl: row[IWN.PIPE.SOURCE_URL]
    };
  });
  return map;
}

function iwnAlreadySentToday_(type, recipient) {
  const sheet = iwnSheet_(IWN.SHEETS.DIST_LOG);
  const last = sheet.getLastRow();
  if (last < 2) return false;
  const today = iwnToday_();
  const tz = iwnSetting_('TIMEZONE', 'Africa/Lagos');
  const rows = sheet.getRange(2, 1, last - 1, 6).getValues();
  for (let i = 0; i < rows.length; i++) {
    const d = rows[i][0] instanceof Date ? Utilities.formatDate(rows[i][0], tz, 'yyyy-MM-dd') : String(rows[i][0]);
    if (d === today && String(rows[i][1]) === type && String(rows[i][2]) === recipient) return true;
  }
  return false;
}

function iwnSourceBreakdownToday_() {
  const sheet = iwnSheet_(IWN.SHEETS.SOURCE_PERF);
  const last = sheet.getLastRow();
  if (last < 2) return '- No harvest stats yet.';
  const today = iwnToday_();
  const tz = iwnSetting_('TIMEZONE', 'Africa/Lagos');
  const rows = sheet.getRange(2, 1, last - 1, 5).getValues();
  const lines = [];
  rows.forEach(function (row) {
    const d = row[0] instanceof Date ? Utilities.formatDate(row[0], tz, 'yyyy-MM-dd') : String(row[0]);
    if (d !== today) return;
    lines.push('- ' + row[1] + ': harvested ' + row[2] + ', duplicates blocked ' + row[3] + ', distributed ' + row[4]);
  });
  return lines.length ? lines.join('\n') : '- No harvest stats yet.';
}
