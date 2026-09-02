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
      // ── Osun territory guard: ONLY Ruth receives Osun leads ───────────────
      const isOsunLead = /osun|osogbo|ilesa/i.test(String(entry.territory || ''));
      if (isOsunLead && !/ruth/i.test(name)) {
        Logger.log('Distribution: Osun lead blocked from ' + name + ' — only Ruth receives Osun leads: ' + entry.company);
        return;
      }
      byRep[name] = byRep[name] || [];
      byRep[name].push(entry);
    }
  });

  // ── Grouping rules — merge reps who share the same digest ─────────────────
  // Rule 1: Henry Adiene + Titilade Bakare → send combined email to both
  const henryLeads     = byRep['Henry Adiene']    || [];
  const titiladeLeads  = byRep['Titilade Bakare']  || [];
  const henryTitiGroup = henryLeads.concat(titiladeLeads);

  // Rule 2: Elizabeth Tola + Emmanuel Oladimeji → send combined email to both
  const elizabethLeads  = byRep['Elizabeth Tola']       || [];
  const emmanuelLeads   = byRep['Emmanuel Oladimeji']   || [];
  const elizEmmaGroup   = elizabethLeads.concat(emmanuelLeads);

  // Mark individual keys as handled so main loop skips them
  const GROUPED_REPS = {
    'Henry Adiene':      'HENRY_TITILADE_GROUP',
    'Titilade Bakare':   'HENRY_TITILADE_GROUP',
    'Elizabeth Tola':    'ELIZ_EMMA_GROUP',
    'Emmanuel Oladimeji':'ELIZ_EMMA_GROUP'
  };

  // ── Rep digests (real business targets only) ─────────────────────────────
  const reps = iwnGetReps_();

  // ── Helper: send a combined digest to multiple reps ───────────────────────
  function sendGroupedDigest(groupLeads, groupReps) {
    if (!groupLeads.length) return;
    // Check if any rep in group already received today
    const anyAlreadySent = groupReps.some(function(r) {
      return iwnAlreadySentToday_('DIGEST', r.email);
    });
    if (anyAlreadySent) return;

    const groupEmails  = groupReps.map(function(r) { return r.email; }).join(',');
    const groupNames   = groupReps.map(function(r) { return r.name.split(' ')[0]; }).join(' & ');
    const allTerritories = groupReps.reduce(function(acc, r) {
      return acc.concat(r.territories || []);
    }, []);

    const tz         = iwnSetting_('TIMEZONE', 'Africa/Lagos');
    const workbookUrl = iwnSs_().getUrl();

    const htmlCards = groupLeads.map(function (item, idx) {
      const p = item.pipe || {};
      // WhatsApp link rotates: first rep gets priority
      const firstRep = groupReps[0];
      const waUrl = firstRep.whatsapp
        ? ('https://wa.me/' + String(firstRep.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent('Good day, I am following up from I-World Networks regarding enterprise internet connectivity for ' + item.company))
        : '';
      const mapsUrl    = p.maps || item.sourceUrl || '';
      const linkedinUrl = p.linkedin || '';
      const pitch      = iwnSuggestedPitch_(p.sector, item.intent);
      const phone      = (p.details && p.details !== 'Contact TBD') ? p.details : 'Check Google Maps';
      const buttons = [
        mapsUrl    ? '<a href="' + mapsUrl    + '" target="_blank" style="display:inline-block;padding:6px 12px;margin:3px 6px 3px 0;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;">📍 Google Maps</a>' : '',
        waUrl      ? '<a href="' + waUrl      + '" target="_blank" style="display:inline-block;padding:6px 12px;margin:3px 6px 3px 0;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;">💬 WhatsApp</a>' : '',
        linkedinUrl ? '<a href="' + linkedinUrl + '" target="_blank" style="display:inline-block;padding:6px 12px;margin:3px 6px 3px 0;background:#f8fafc;color:#334155;border:1px solid #cbd5e1;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;">💼 LinkedIn</a>' : ''
      ].filter(Boolean).join('');

      return '<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.04);overflow:hidden;">' +
        '<div style="background:#f8fafc;padding:12px 18px;border-bottom:1px solid #e2e8f0;">' +
          '<span style="display:inline-block;background:#0284c7;color:#ffffff;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:12px;margin-right:8px;">#' + (idx + 1) + '</span>' +
          '<strong style="font-size:15px;color:#0f172a;">' + item.company + '</strong>' +
        '</div>' +
        '<div style="padding:14px 18px;font-size:13px;color:#334155;line-height:1.6;">' +
          '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
            '<tr><td style="padding:3px 0;color:#64748b;width:80px;"><strong>Sector:</strong></td><td>' + (p.sector || 'Corporate') + ' &nbsp;<span style="background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">' + (item.territory || 'SW Nigeria') + '</span></td></tr>' +
            '<tr><td style="padding:3px 0;color:#64748b;"><strong>Phone:</strong></td><td style="font-weight:600;">' + phone + '</td></tr>' +
            '<tr><td style="padding:3px 0;color:#64748b;"><strong>Pitch:</strong></td><td style="font-style:italic;color:#475569;">' + pitch + '</td></tr>' +
          '</table>' +
          '<div style="margin-top:12px;padding-top:10px;border-top:1px dashed #e2e8f0;">' + buttons + '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    const htmlBody = '<div style="background:#f1f5f9;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">' +
      '<div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);border:1px solid #e2e8f0;">' +
        '<div style="background:#0f172a;padding:24px 28px;">' +
          '<div style="font-size:11px;letter-spacing:1.5px;font-weight:bold;color:#38bdf8;text-transform:uppercase;margin-bottom:4px;">I-World Networks &bull; Sales Lead Engine</div>' +
          '<h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">Daily Outbound Prospects</h1>' +
          '<div style="font-size:12px;color:#94a3b8;margin-top:4px;">' + Utilities.formatDate(new Date(), tz, 'EEEE, MMMM dd, yyyy') + ' &bull; Assigned to ' + groupNames + '</div>' +
        '</div>' +
        '<div style="padding:24px 28px;">' +
          '<p style="font-size:14px;color:#334155;margin-top:0;margin-bottom:14px;line-height:1.5;">Hello <strong>' + groupNames + '</strong>,<br>Here are your <strong>' + groupLeads.length + ' combined commercial business targets</strong> for today. Please coordinate between yourselves, conduct initial discovery calls, and offer our free corporate site survey:</p>' +
          '<div style="background:#fffbeb;border:1px solid #fef3c7;border-left:4px solid #f59e0b;border-radius:6px;padding:10px 14px;margin-bottom:20px;font-size:12px;color:#92400e;line-height:1.4;">💡 <strong>Team Note:</strong> This is a combined digest for your joint territory. If any account is already active or in conversation with your team, mark it as <em>Contacted</em> in the pipeline and prioritize the new accounts.</div>' +
          htmlCards +
          '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;text-align:center;margin-top:24px;">' +
            '<div style="font-size:13px;color:#475569;margin-bottom:10px;">Update outreach status in the shared tracker:</div>' +
            '<a href="' + workbookUrl + '" style="display:inline-block;padding:9px 18px;background:#0284c7;color:#ffffff;font-size:13px;font-weight:bold;text-decoration:none;border-radius:6px;">Open 03 Sales Pipeline Sheet &rarr;</a>' +
          '</div>' +
          '<div style="margin-top:24px;padding-top:16px;border-top:1px solid #f1f5f9;font-size:12px;color:#64748b;">' +
            'Best regards,<br><strong style="color:#0f172a;font-size:13px;">Reformer Ejembi</strong><br>Digital &amp; Web Team Lead &bull; I-World Networks Limited<br>' +
            '<a href="https://iworldnetworks.net" style="color:#0284c7;text-decoration:none;">iworldnetworks.net</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

    const plainBody = 'Good day ' + groupNames + ',\n\nHere are your ' + groupLeads.length + ' combined targets for today:\n\n' +
      groupLeads.map(function(item, idx) {
        const p = item.pipe || {};
        return '[' + (idx+1) + '] ' + item.company + ' (' + (item.territory||'SW Nigeria') + ')\n' +
          'Sector: ' + (p.sector||'Corporate') + ' | Contact: ' + (p.details||'TBD') + '\n' +
          'Maps: ' + (p.maps||item.sourceUrl||'N/A');
      }).join('\n\n') +
      '\n\nUpdate status in 03 Sales Pipeline:\n' + workbookUrl + '\n\nReformer Ejembi\nDigital & Web Team Lead\nI-World Networks Limited';

    const subject = '🎯 IWN Daily Leads — ' + groupLeads.length + ' Target Accounts — ' +
      Utilities.formatDate(new Date(), tz, 'MMM dd, yyyy');

    GmailApp.sendEmail(groupReps[0].email, subject, plainBody, {
      htmlBody: htmlBody,
      cc: groupReps.slice(1).map(function(r){return r.email;}).join(',')
    });
    groupReps.forEach(function(r) {
      iwnLogDist_('DIGEST', r.email, groupLeads.length, '', today);
    });
  }

  // ── Fire grouped digests first ─────────────────────────────────────────────
  const henryRep    = reps.filter(function(r){ return r.name === 'Henry Adiene'; })[0];
  const titiladeRep = reps.filter(function(r){ return r.name === 'Titilade Bakare'; })[0];
  const elizRep     = reps.filter(function(r){ return r.name === 'Elizabeth Tola'; })[0];
  const emmaRep     = reps.filter(function(r){ return r.name === 'Emmanuel Oladimeji'; })[0];

  if (henryRep && titiladeRep) sendGroupedDigest(henryTitiGroup, [henryRep, titiladeRep]);
  if (elizRep  && emmaRep)     sendGroupedDigest(elizEmmaGroup,  [elizRep, emmaRep]);

  reps.forEach(function (rep) {
    // Skip reps handled by a group digest above
    if (GROUPED_REPS[rep.name]) return;
    const leads = byRep[rep.name] || [];
    if (!leads.length || !rep.email) return;
    if (iwnAlreadySentToday_('DIGEST', rep.email)) return;

    const firstName = String(rep.name || '').trim().split(' ')[0];
    const workbookUrl = iwnSs_().getUrl();

    // ── Build Ultra-Clean HTML Cards ──────────────────────────────────────
    const htmlCards = leads.map(function (item, idx) {
      const p = item.pipe || {};
      const waUrl = rep.whatsapp
        ? ('https://wa.me/' + String(rep.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent('Good day, I am following up from I-World Networks regarding enterprise internet connectivity for ' + item.company))
        : '';
      const mapsUrl = p.maps || item.sourceUrl || '';
      const linkedinUrl = p.linkedin || '';
      const sourceUrl = item.sourceUrl || p.sourceUrl || '';
      const pitch = iwnSuggestedPitch_(p.sector, item.intent);
      const phone = (p.details && p.details !== 'Contact TBD') ? p.details : 'Check Google Maps';

      const buttons = [
        mapsUrl ? '<a href="' + mapsUrl + '" target="_blank" style="display:inline-block;padding:6px 12px;margin:3px 6px 3px 0;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;">📍 Google Maps</a>' : '',
        waUrl ? '<a href="' + waUrl + '" target="_blank" style="display:inline-block;padding:6px 12px;margin:3px 6px 3px 0;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;">💬 WhatsApp</a>' : '',
        linkedinUrl ? '<a href="' + linkedinUrl + '" target="_blank" style="display:inline-block;padding:6px 12px;margin:3px 6px 3px 0;background:#f8fafc;color:#334155;border:1px solid #cbd5e1;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;">💼 LinkedIn</a>' : ''
      ].filter(Boolean).join('');

      return '<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.04);overflow:hidden;">' +
        '<div style="background:#f8fafc;padding:12px 18px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">' +
          '<div>' +
            '<span style="display:inline-block;background:#0284c7;color:#ffffff;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:12px;margin-right:8px;">#' + (idx + 1) + '</span>' +
            '<strong style="font-size:15px;color:#0f172a;">' + item.company + '</strong>' +
          '</div>' +
        '</div>' +
        '<div style="padding:14px 18px;font-size:13px;color:#334155;line-height:1.6;">' +
          '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
            '<tr>' +
              '<td style="padding:3px 0;color:#64748b;width:80px;vertical-align:top;"><strong>Sector:</strong></td>' +
              '<td style="padding:3px 0;color:#0f172a;">' + (p.sector || 'Corporate / Commercial') + ' &nbsp; <span style="background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">' + (item.territory || 'Southwest') + '</span></td>' +
            '</tr>' +
            '<tr>' +
              '<td style="padding:3px 0;color:#64748b;vertical-align:top;"><strong>Phone / Contact:</strong></td>' +
              '<td style="padding:3px 0;color:#0f172a;font-weight:600;">' + phone + '</td>' +
            '</tr>' +
            '<tr>' +
              '<td style="padding:3px 0;color:#64748b;vertical-align:top;"><strong>Pitch Focus:</strong></td>' +
              '<td style="padding:3px 0;color:#475569;font-style:italic;">' + pitch + '</td>' +
            '</tr>' +
          '</table>' +
          '<div style="margin-top:12px;padding-top:10px;border-top:1px dashed #e2e8f0;">' +
            buttons +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    const htmlBody = '<div style="background:#f1f5f9;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;">' +
      '<div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);border:1px solid #e2e8f0;">' +

        // ── Brand Header ────────────────────────────────────────────────────
        '<div style="background:#0f172a;padding:24px 28px;text-align:left;">' +
          '<div style="font-size:11px;letter-spacing:1.5px;font-weight:bold;color:#38bdf8;text-transform:uppercase;margin-bottom:4px;">I-World Networks &bull; Sales Lead Engine</div>' +
          '<h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">Daily Outbound Prospects</h1>' +
          '<div style="font-size:12px;color:#94a3b8;margin-top:4px;">' + Utilities.formatDate(new Date(), tz, 'EEEE, MMMM dd, yyyy') + ' &bull; Assigned to ' + rep.name + '</div>' +
        '</div>' +

        // ── Body Container ──────────────────────────────────────────────────
        '<div style="padding:24px 28px;">' +
          '<p style="font-size:14px;color:#334155;margin-top:0;margin-bottom:14px;line-height:1.5;">' +
            'Hello <strong>' + firstName + '</strong>,<br>' +
            'Here are your <strong>' + leads.length + ' commercial business targets</strong> for today in your territory. Please review each account, conduct your initial discovery calls, and offer our free corporate site survey:' +
          '</p>' +

          // ── Duplicate Notice Banner ───────────────────────────────────────
          '<div style="background:#fffbeb;border:1px solid #fef3c7;border-left:4px solid #f59e0b;border-radius:6px;padding:10px 14px;margin-bottom:20px;font-size:12px;color:#92400e;line-height:1.4;">' +
            '💡 <strong>Team Note:</strong> If any account below is already active or in conversation with your team, mark it as <em>Contacted</em> in the pipeline sheet and prioritize the new accounts.' +
          '</div>' +

          htmlCards +

          // ── Action CTA Box ────────────────────────────────────────────────
          '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;text-align:center;margin-top:24px;">' +
            '<div style="font-size:13px;color:#475569;margin-bottom:10px;">Remember to update outreach status in the shared tracker:</div>' +
            '<a href="' + workbookUrl + '" style="display:inline-block;padding:9px 18px;background:#0284c7;color:#ffffff;font-size:13px;font-weight:bold;text-decoration:none;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,0.05);">Open 03 Sales Pipeline Sheet &rarr;</a>' +
          '</div>' +

          // ── Sign-off ──────────────────────────────────────────────────────
          '<div style="margin-top:24px;padding-top:16px;border-top:1px solid #f1f5f9;font-size:12px;color:#64748b;line-height:1.5;">' +
            'Best regards,<br>' +
            '<strong style="color:#0f172a;font-size:13px;">Reformer Ejembi</strong><br>' +
            'Digital &amp; Web Team Lead &bull; I-World Networks Limited<br>' +
            '<a href="https://iworldnetworks.net" style="color:#0284c7;text-decoration:none;">iworldnetworks.net</a>' +
          '</div>' +

        '</div>' +
      '</div>' +
    '</div>';

    // ── Plain-Text Fallback ───────────────────────────────────────────────
    const plainCards = leads.map(function (item, idx) {
      const p = item.pipe || {};
      const wa = rep.whatsapp
        ? ('https://wa.me/' + String(rep.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent('Good day from I-World Networks regarding ' + item.company))
        : '';
      return [
        '[' + (idx + 1) + '] ' + item.company + ' (' + (item.territory || 'SW Nigeria') + ')',
        'Sector: ' + (p.sector || 'Corporate') + ' | Contact: ' + (p.details || 'TBD'),
        'Maps: ' + (p.maps || item.sourceUrl || 'N/A'),
        'LinkedIn: ' + (p.linkedin || 'N/A'),
        'Pitch: ' + iwnSuggestedPitch_(p.sector, item.intent),
        wa ? ('WhatsApp: ' + wa) : ''
      ].filter(Boolean).join('\n');
    }).join('\n\n');

    const plainBody = 'Good day ' + firstName + ',\n\n' +
      'Here are your ' + leads.length + ' fresh business targets for today in ' + (rep.territories ? rep.territories.join(', ') : 'your territory') + ':\n\n' +
      'NOTE: If any account below is already active or in conversation with your team, mark it accordingly in the pipeline.\n\n' +
      plainCards + '\n\n' +
      'Update status in Column P of 03 Sales Pipeline:\n' +
      workbookUrl + '\n\n' +
      'Reformer Ejembi\nDigital & Web Team Lead\nI-World Networks Limited';

    const subject = '🎯 IWN Daily Leads — ' + leads.length + ' Target Accounts — ' +
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
    'Please find my daily report for ' + dateLabel + ':\n\n' +
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
    '1. Training & Support — Google Admin Console: Attended training with Bokola on Google Admin Console. Worked on features to enable the accounts department to pull accurate support revenue data from the CSAT platform, and explained platform usage to the accountants.\n' +
    '2. CKA Exam Proctoring Development: Continued work on the City of Knowledge (CKE) extension and their exam proctoring web application. Tested the application with a mock Google Form. Firebase project will be created tomorrow to continue further integrations.\n' +
    '3. Business Development & Research: Studied Calviro Studio LLC\'s request, assessed how IWN can assist them, and identified a path to onboarding them as a new business client.\n' +
    '4. Sales & Leads: Sent today\'s daily leads to the sales team and added additional prospects to the pipeline.\n' +
    '5. Reporting & Brand Presence: Completed and sent daily report. Worked on maintaining active and engaged social media presence for I-World Networks.\n\n' +
    'NEXT STEPS & IMMEDIATE ACTION ITEMS\n' +
    '--------------------------------------------------\n' +
    '1. CKE Firebase Setup: Create Firebase project tomorrow to continue authentication and database integrations for the CKE proctoring web application.\n' +
    '2. CKE Extension: Continue testing and refinement of the City of Knowledge browser extension.\n' +
    '3. Calviro Studio LLC: Prepare a proposal or follow-up on how IWN can address their requirements and move toward onboarding.\n' +
    '4. Accounts CSAT Feature: Monitor and validate the support revenue data pull feature now that it has been explained to the accounts team.\n' +
    '5. Lead Engine: Continue daily lead dispatch and monitor pipeline engagement from the sales team.\n\n' +
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
