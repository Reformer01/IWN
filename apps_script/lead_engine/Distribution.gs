/**
 * Personalized weekday digests to sales reps + Jude/Reformer summary.
 *
 * ROUTING RULES:
 *  - INBOUND / OSM / GOOGLE_ALERTS  → sales reps (real qualified business targets)
 *  - RSS_NEWS / EVENTS (intelOnly)  → Reformer only (market intelligence)
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
  const intelItems = [];  // RSS_NEWS / EVENTS — Reformer only

  rows.forEach(function (row) {
    const d = row[0] instanceof Date ? Utilities.formatDate(row[0], tz, 'yyyy-MM-dd') : String(row[0]);
    if (d !== today) return;
    const name    = row[1];
    const source  = String(row[7] || '');          // col H = source
    const isIntel = /RSS_NEWS|EVENTS/i.test(source);

    const entry = {
      leadId:    row[2],
      company:   row[3],
      territory: row[4],
      intent:    row[5],
      sourceUrl: row[6],
      source:    source,
      pipe:      pipeline[row[2]]
    };

    if (isIntel) {
      intelItems.push(entry);
    } else {
      byRep[name] = byRep[name] || [];
      byRep[name].push(entry);
    }
  });

  // ── Rep digests (real business targets only) ─────────────────────────────
  const reps = iwnGetReps_();
  reps.forEach(function (rep) {
    const leads = byRep[rep.name] || [];
    if (!leads.length || !rep.email) return;
    if (iwnAlreadySentToday_('DIGEST', rep.email)) return;

    const firstName = String(rep.name || '').trim().split(' ')[0];
    const workbookUrl = iwnSs_().getUrl();

    // ── Build HTML Cards with Embedded Links ──────────────────────────────
    const htmlCards = leads.map(function (item) {
      const p = item.pipe || {};
      const waUrl = rep.whatsapp
        ? ('https://wa.me/' + String(rep.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent('Hi, following up from I-World Networks regarding ' + item.company))
        : '';
      const mapsUrl = p.maps || item.sourceUrl || '';
      const linkedinUrl = p.linkedin || '';
      const sourceUrl = item.sourceUrl || p.sourceUrl || '';
      const pitch = iwnSuggestedPitch_(p.sector, item.intent);

      const links = [
        mapsUrl ? '<a href="' + mapsUrl + '" style="color:#1a73e8;text-decoration:none;font-weight:bold;">📍 View on Google Maps</a>' : '',
        linkedinUrl ? '<a href="' + linkedinUrl + '" style="color:#0077b5;text-decoration:none;font-weight:bold;">💼 LinkedIn Company Search</a>' : '',
        waUrl ? '<a href="' + waUrl + '" style="color:#25d366;text-decoration:none;font-weight:bold;">💬 Open WhatsApp Chat</a>' : '',
        (sourceUrl && sourceUrl !== mapsUrl) ? '<a href="' + sourceUrl + '" style="color:#5f6368;text-decoration:none;">🔗 Source Reference</a>' : ''
      ].filter(Boolean).join(' &nbsp;|&nbsp; ');

      return '<div style="background:#ffffff;border:1px solid #dadce0;border-left:4px solid #1a73e8;border-radius:6px;padding:14px 18px;margin-bottom:16px;">' +
        '<div style="font-size:16px;font-weight:bold;color:#202124;margin-bottom:4px;">' +
          item.leadId + ' &bull; ' + item.company +
          (item.territory ? ' <span style="font-size:13px;color:#5f6368;font-weight:normal;">(' + item.territory + ')</span>' : '') +
        '</div>' +
        '<div style="font-size:13px;color:#3c4043;line-height:1.6;margin-bottom:8px;">' +
          '<strong>Sector:</strong> ' + (p.sector || 'Corporate / Industrial') + ' &nbsp;|&nbsp; ' +
          '<strong>Intent:</strong> <span style="background:#e8f0fe;color:#174ea6;padding:2px 6px;border-radius:4px;font-size:12px;">' + (item.intent || 'Target Account') + '</span><br>' +
          '<strong>Contact / Decision Maker:</strong> ' + (p.details || 'Contact TBD') + '<br>' +
          '<strong>Suggested Pitch:</strong> <em>' + pitch + '</em>' +
        '</div>' +
        '<div style="font-size:13px;padding-top:6px;border-top:1px solid #f1f3f4;">' +
          links +
        '</div>' +
      '</div>';
    }).join('');

    const htmlBody = '<div style="font-family:Arial,sans-serif;color:#202124;max-width:680px;line-height:1.5;">' +
      '<p style="font-size:15px;margin-bottom:12px;">Good day ' + firstName + ',</p>' +
      '<p style="font-size:14px;color:#3c4043;margin-bottom:14px;">' +
        'Here are your fresh business targets for today in your assigned territory. These are verified corporate accounts ideal for an initial ISP audit outreach:' +
      '</p>' +
      '<div style="background:#fef7e0;border:1px solid #f9ab00;border-left:4px solid #f29900;border-radius:4px;padding:10px 14px;margin-bottom:18px;font-size:13px;color:#7a4b04;line-height:1.4;">' +
        '💡 <strong>Rep Note:</strong> If any account listed below has already been contacted or claimed previously by your team, please ignore it or mark it as <em>Contacted</em> in the pipeline and focus your outreach on the fresh new accounts.' +
      '</div>' +
      htmlCards +
      '<div style="background:#f8f9fa;border:1px solid #e8eaed;border-radius:6px;padding:12px 16px;margin-top:20px;font-size:13px;color:#3c4043;">' +
        '📝 <strong>Next Action:</strong> Update outreach status (<code style="background:#e8eaed;padding:2px 4px;border-radius:3px;">Claimed</code>, <code style="background:#e8eaed;padding:2px 4px;border-radius:3px;">Contacted</code>, <code style="background:#e8eaed;padding:2px 4px;border-radius:3px;">Meeting</code>, <code style="background:#e8eaed;padding:2px 4px;border-radius:3px;">Closed</code>) in Column P of ' +
        '<a href="' + workbookUrl + '" style="color:#1a73e8;font-weight:bold;text-decoration:none;">03 Sales Pipeline</a>.' +
      '</div>' +
      '<p style="font-size:13px;color:#5f6368;margin-top:22px;line-height:1.4;">' +
        'Best regards,<br><br>' +
        '<strong>Reformer Ejembi</strong><br>' +
        'Digital &amp; Web Team Lead<br>' +
        'I-World Networks Limited' +
      '</p>' +
    '</div>';

    // ── Plain-Text Fallback ───────────────────────────────────────────────
    const plainCards = leads.map(function (item) {
      const p = item.pipe || {};
      const wa = rep.whatsapp
        ? ('https://wa.me/' + String(rep.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent('Hi, following up from I-World Networks regarding ' + item.company))
        : '';
      return [
        item.leadId + ' | ' + item.company + ' | ' + (item.territory || ''),
        'Sector: ' + (p.sector || '') + ' | Intent: ' + (item.intent || ''),
        'Contact: ' + (p.details || 'TBD'),
        'Maps: ' + (p.maps || item.sourceUrl || ''),
        'LinkedIn: ' + (p.linkedin || ''),
        'Suggested pitch: ' + iwnSuggestedPitch_(p.sector, item.intent),
        wa ? ('WhatsApp: ' + wa) : ''
      ].filter(Boolean).join('\n');
    }).join('\n\n');

    const plainBody = 'Good day ' + firstName + ',\n\n' +
      'Here are your fresh business targets for today in your assigned territory:\n\n' +
      'NOTE: If any account listed below has already been contacted by your team previously, please ignore it or mark it accordingly in the pipeline and focus on the fresh new accounts.\n\n' +
      plainCards + '\n\n' +
      'Mark Claimed / Contacted / Meeting / Closed in column P of 03 Sales Pipeline.\n' +
      'Workbook: ' + workbookUrl + '\n\n' +
      'Reformer Ejembi\nDigital & Web Team Lead\nI-World Networks Limited';

    const subject = 'IWN daily leads — ' + leads.length + ' accounts — ' +
      Utilities.formatDate(new Date(), tz, 'MMM dd, yyyy');

    GmailApp.sendEmail(rep.email, subject, plainBody, {
      htmlBody: htmlBody
    });
    iwnLogDist_('DIGEST', rep.email, leads.length, '', today);
  });

  // ── Intel digest to Reformer only ────────────────────────────────────────
  if (intelItems.length) {
    sendIntelDigestToReformer_(intelItems, today, tz);
  }
}

/**
 * Market intelligence digest — news/event signals sent ONLY to Reformer.
 * NOT distributed to sales reps.
 */
function sendIntelDigestToReformer_(items, today, tz) {
  const reformerEmail = String(iwnSetting_('REFORMER_EMAIL', 'reformer.ejembi@iworldnetworks.net'));
  if (iwnAlreadySentToday_('INTEL_DIGEST', reformerEmail)) return;

  const lines = items.map(function (item) {
    return '• [' + (item.source || 'NEWS') + '] ' + item.company +
      (item.territory ? ' — ' + item.territory : '') +
      '\n  Intent: ' + (item.intent || 'Expansion Signal') +
      '\n  URL: ' + (item.sourceUrl || '');
  }).join('\n\n');

  const subject = 'IWN Market Intel — ' + items.length + ' news signals — ' +
    Utilities.formatDate(new Date(), tz, 'MMM dd, yyyy');
  const body = 'Hi Reformer,\n\n' +
    'These ' + items.length + ' signals came from news RSS feeds and event scanners today.\n' +
    'They are NOT sent to sales reps — review for strategic targeting or manual lead creation.\n\n' +
    lines + '\n\n' +
    'To convert any to a real lead: use IWN Lead Engine > Add manual lead (sidebar).\n\n' +
    'IWN Lead Engine\nAuto-generated';

  GmailApp.sendEmail(reformerEmail, subject, body);
  iwnLogDist_('INTEL_DIGEST', reformerEmail, items.length, '', today);
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
    'Please find my daily report for ' + dateLabel + ', summarizing CUAB license increase escalation follow-up, sales team BTS MRR platform training, CSAT platform feature enhancements, customer complaint analytics architecture, and new customer onboarding documentation:\n\n' +
    'REVENUE PERFORMANCE & PIPELINE TRACKING\n' +
    '--------------------------------------------------\n' +
    '- Daily Revenue Target: ' + dailyTarget + '\n' +
    '- Daily Revenue Closed Today: ' + dailyActual + ' (Variance: ' + dailyVariance + ')\n' +
    '- Monthly Revenue Target: ' + monthlyTarget + '\n' +
    '- MTD Revenue Closed: ' + monthlyActual + '\n' +
    '- Qualified Pipeline Leads: ' + pipelineCount + '\n' +
    '- Total Pipeline MRR Value: ' + pipelineMRR + '\n\n' +
    'TECHNICAL, DIGITAL & MANAGEMENT ACHIEVEMENTS TODAY\n' +
    '--------------------------------------------------\n' +
    '1. CUAB License Increase Escalation Follow-Up: Followed up with technical support & account management on the Crescent University Abeokuta (CUAB) Google Workspace license increase request to expedite provisioning and administrative approval.\n' +
    '2. Sales Team BTS MRR Platform Training: Conducted an interactive operational training session with the sales team on utilizing the CSAT platform to track, query, and extract their BTS MRR performance data.\n' +
    '3. CSAT Platform Feature Enhancements: Developed and deployed core enhancements, stability updates, and usability optimizations across active CSAT platform modules.\n' +
    '4. Customer Complaint Frequency & Classification Architecture: Explored and scoped architectural frameworks within CSAT to categorize complaint types and track customer issue recurrence frequency.\n' +
    '5. New Customer Welcome Guide & Billing Documentation: Collaborated with the Billing & Accounts Department to structure and standardize the official welcome guide and onboarding documentation for new subscribers.\n\n' +
    'NEXT STEPS & IMMEDIATE ACTION ITEMS\n' +
    '--------------------------------------------------\n' +
    '1. CSAT Complaint Analytics Module: Finalize data models and UI widgets to track complaint frequency and issue categorization in CSAT.\n' +
    '2. CUAB License Quota Activation: Confirm final license increase activation on Google Admin Console for CUAB.\n' +
    '3. New Customer Welcome Guide Rollout: Finalize digital distribution workflow and automated billing dispatch for the welcome guide.\n' +
    '4. Sales BTS MRR Adoption Monitoring: Monitor sales team daily engagement and BTS MRR data utilization across all territories.\n' +
    '5. Sales Pipeline Territory Outreach Cadence: Review sales representatives outreach cadence on newly assigned target enterprise accounts in 03 Sales Pipeline.\n\n' +
    'DIRECT SHEET LINKS:\n' +
    '- Open Revenue Tracker: ' + singleSheetUrl + '\n' +
    '- Download PDF (Tracker Only): ' + pdfExportUrl + '\n\n' +
    'Best regards,\n\n' +
    'Reformer Ejembi\n' +
    'Digital & Web Team Lead\n' +
    'I-World Networks Limited';

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
