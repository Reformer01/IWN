/**
 * Website form webhook (doPost) + 15-minute inbound processor.
 */

function doPost(e) {
  try {
    const data = parseInboundPayload_(e);
    const secret = String(iwnSetting_('WEBHOOK_SECRET', '') || '').trim();
    if (secret && data.secret && data.secret !== secret) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const leadId = ingestInboundLead_(data);
    return ContentService.createTextOutput(JSON.stringify({ ok: true, leadId: leadId }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function parseInboundPayload_(e) {
  if (e && e.postData && e.postData.contents) {
    const type = (e.postData.type || '').toLowerCase();
    if (type.indexOf('json') !== -1 || String(e.postData.contents).charAt(0) === '{') {
      return JSON.parse(e.postData.contents);
    }
  }
  const p = (e && e.parameter) || {};
  return p;
}

function ingestInboundLead_(data) {
  bootstrapIfNeeded_();
  const name = data.name || data.full_name || data.fullname || '';
  const email = data.email || '';
  const phone = data.phone || '';
  const state = data.state || '';
  const internetType = data.internet_type || data.internetType || '';
  const address = data.address || '';
  const source = data.source || data.subject || 'Web Lead';
  const extra = JSON.stringify({
    timeline: data.timeline || data.decisionStage || '',
    scale: data.scale || '',
    preferred: data.preferred || ''
  });

  iwnAppend_(iwnSheet_(IWN.SHEETS.INBOUND), [[
    new Date(), name, email, phone, state, internetType, address, source, extra, '', '', ''
  ]]);
  return processInboundWebhookQueue();
}

function processInboundWebhookQueue() {
  bootstrapIfNeeded_();
  const sheet = iwnSheet_(IWN.SHEETS.INBOUND);
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  const width = IWN.HEADERS.INBOUND.length;
  const data = sheet.getRange(2, 1, last - 1, width).getValues();
  const leads = [];
  const idxs = [];

  data.forEach(function (row, i) {
    if (String(row[IWN.INBOUND.PROCESSED]).toUpperCase() === 'TRUE') return;
    idxs.push(i);
    const state = row[IWN.INBOUND.STATE];
    const name = row[IWN.INBOUND.NAME] || 'Inbound prospect';
    leads.push({
      company: name,
      contact: name,
      email: row[IWN.INBOUND.EMAIL] || '',
      phone: row[IWN.INBOUND.PHONE] || '',
      location: state || row[IWN.INBOUND.ADDRESS] || '',
      sector: row[IWN.INBOUND.TYPE] || 'Inbound Web',
      source: row[IWN.INBOUND.SOURCE] || 'Web',
      sourceUrl: iwnSs_().getUrl(),
      intentTag: 'Inbound — Hot'
    });
  });

  if (!leads.length) return 0;

  const pipe = iwnSheet_(IWN.SHEETS.PIPELINE);
  const before = pipe.getLastRow();
  const written = assignAndWritePipeline(leads);
  const after = pipe.getLastRow();
  const newCount = Math.max(after - before, 0);
  const newRows = newCount
    ? pipe.getRange(before + 1, 1, newCount, IWN.HEADERS.PIPELINE.length).getValues()
    : [];

  idxs.forEach(function (i, n) {
    const nr = newRows[n];
    sheet.getRange(i + 2, IWN.INBOUND.PROCESSED + 1).setValue('TRUE');
    if (nr) {
      sheet.getRange(i + 2, IWN.INBOUND.ROUTED + 1).setValue(nr[IWN.PIPE.REP]);
      sheet.getRange(i + 2, IWN.INBOUND.LEAD_ID + 1).setValue(nr[IWN.PIPE.ID]);
    }
  });

  sendInboundHotAlertsFromPipeline_(newRows);
  return written;
}

function sendInboundHotAlertsFromPipeline_(pipeRows) {
  const reps = iwnGetReps_();
  const byName = {};
  reps.forEach(function (r) { byName[r.name] = r; });
  const grouped = {};
  pipeRows.forEach(function (row) {
    const name = row[IWN.PIPE.REP];
    grouped[name] = grouped[name] || [];
    grouped[name].push(row);
  });
  Object.keys(grouped).forEach(function (name) {
    const rep = byName[name];
    if (!rep || !rep.email) return;
    const lines = grouped[name].map(function (row) {
      return row[IWN.PIPE.ID] + ' | ' + row[IWN.PIPE.COMPANY] + ' | ' +
        row[IWN.PIPE.DETAILS] + ' | ' + row[IWN.PIPE.TERRITORY];
    }).join('\n');
    GmailApp.sendEmail(rep.email, 'HOT inbound lead — IWN (' + grouped[name].length + ')',
      'New inbound web lead(s):\n\n' + lines + '\n\n' + iwnSs_().getUrl());
    iwnLogDist_('INBOUND_HOT', rep.email, grouped[name].length, '', '');
  });
}
