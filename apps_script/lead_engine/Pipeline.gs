/**
 * Append-only pipeline writer. Never re-processes rows marked TRUE.
 */

function processRawInboundLeads() {
  bootstrapIfNeeded_();
  const rawSheet = iwnSheet_(IWN.SHEETS.RAW);
  const last = rawSheet.getLastRow();
  if (last < 2) {
    SpreadsheetApp.getUi().alert("No new raw leads found in '01 Raw Inbound' to process.");
    return 0;
  }

  const width = IWN.HEADERS.RAW.length;
  const range = rawSheet.getRange(2, 1, last - 1, width);
  const data = range.getValues();
  const unprocessedIdx = [];
  const leads = [];

  data.forEach(function (row, i) {
    if (String(row[IWN.RAW.PROCESSED]).toUpperCase() === 'TRUE') return;
    if (!row[IWN.RAW.COMPANY]) return;
    unprocessedIdx.push(i);
    leads.push({
      company: row[IWN.RAW.COMPANY],
      contact: row[IWN.RAW.CONTACT] || 'Manager / Decision Maker',
      email: row[IWN.RAW.EMAIL] || '',
      phone: row[IWN.RAW.PHONE] || '',
      location: row[IWN.RAW.LOCATION] || '',
      sector: row[IWN.RAW.SECTOR] || 'Corporate / Industrial',
      source: row[IWN.RAW.SOURCE] || 'Manual',
      sourceUrl: row[IWN.RAW.SOURCE_URL] || '',
      intentTag: row[IWN.RAW.INTENT] || 'New Business',
      rawRow: i + 2
    });
  });

  if (!leads.length) {
    try { SpreadsheetApp.getUi().alert('No unprocessed raw leads.'); } catch (e) { /* trigger */ }
    return 0;
  }

  const written = assignAndWritePipeline(leads);
  unprocessedIdx.forEach(function (i) {
    rawSheet.getRange(i + 2, IWN.RAW.PROCESSED + 1).setValue('TRUE');
  });
  try {
    SpreadsheetApp.getUi().alert('Processed and routed ' + written + ' leads to 03 Sales Pipeline.');
  } catch (e) { /* scheduled */ }
  return written;
}

function assignAndWritePipeline(leads) {
  const registry = iwnLoadRegistry_();
  const pipeline = iwnSheet_(IWN.SHEETS.PIPELINE);
  const assignSheet = iwnSheet_(IWN.SHEETS.ASSIGNMENTS);
  const quota = Number(iwnSetting_('DAILY_QUOTA_PER_REP', 8));
  const counts = iwnTodayOutboundCounts_();
    const mrr = Number(iwnSetting_('DEFAULT_MRR', 450000));
    const pipeRows = [];
  const assignRows = [];
  let blocked = 0;
  const blockedBySource = {};
  const distBySource = {};

  const enriched = iwnEnrichBatch_(leads);

  enriched.forEach(function (lead) {
    const inbound = /inbound/i.test(lead.intentTag || lead.source || '');
    // RSS_NEWS and EVENTS are market intelligence — NOT for sales reps
    const isIntel = /^(RSS_NEWS|EVENTS)$/i.test(String(lead.source || '')) || lead.intelOnly === true;
    const check = iwnRegistryCheck_(registry, lead);
    if (!check.accept && !inbound) {
      blocked++;
      blockedBySource[lead.source || 'Unknown'] = (blockedBySource[lead.source || 'Unknown'] || 0) + 1;
      iwnRegistryMarkBlocked_(registry, check.key);
      return;
    }

    const intent = check.reemerged ? ((lead.intentTag || 'New Business') + ' | Re-emerged') : (lead.intentTag || 'New Business');
    const email = lead.email && String(lead.email).indexOf('800 IWN') === -1 ? lead.email : (lead.email || '');
    const phone = lead.phone && String(lead.phone).indexOf('800 IWN') === -1 ? lead.phone : (lead.phone || '');
    const details = [phone, email].filter(Boolean).join(' | ') || 'Contact TBD';
    const leadId = iwnNextLeadId_();

    if (isIntel) {
      // Write to pipeline as INTEL_ONLY — no rep, no assignment row
      pipeRows.push([
        leadId,
        lead.company,
        lead.contact || '',
        details,
        'INTEL — Reformer Only',   // rep column
        iwnExtractRegion_(lead.location),
        lead.sector,
        0,                          // no MRR counted for intel
        'Intel Signal — Not for Reps',
        new Date(),
        intent,
        lead.sourceUrl || '',
        lead.mapsLink || iwnMapsLink_(lead.company, lead.location),
        lead.linkedinSearch || iwnLinkedInSearch_(lead.company),
        check.key,
        '',
        '',
        '',
        lead.source || ''
      ]);
      // Write assignment row with source col so intel digest can pick it up
      assignRows.push([
        new Date(), 'Reformer', leadId, lead.company,
        iwnExtractRegion_(lead.location), intent, lead.sourceUrl || '', lead.source || ''
      ]);
      iwnRegistryRecord_(registry, lead, check.key, leadId, true);
      distBySource[lead.source || 'Unknown'] = (distBySource[lead.source || 'Unknown'] || 0) + 1;
      return;
    }

    // Normal lead — assign to territory rep
    const info = iwnTerritoryFromLocation_(lead.location);
    if (!info) {
      // Lead is in an out-of-service area (e.g. Lagos) — hard drop
      Logger.log('Pipeline: Dropped out-of-service-area lead — ' + lead.company + ' (' + lead.location + ')');
      blocked++;
      blockedBySource[lead.source || 'Unknown'] = (blockedBySource[lead.source || 'Unknown'] || 0) + 1;
      return;
    }
    const assignment = iwnAssignRep_(lead, counts);

    pipeRows.push([
      leadId,
      lead.company,
      lead.contact || '',
      details,
      assignment.rep.name,
      assignment.region,
      lead.sector,
      mrr,
      inbound ? 'New Lead - Inbound Hot' : 'New Lead - Audit Offered',
      new Date(),
      intent,
      lead.sourceUrl || '',
      lead.mapsLink || iwnMapsLink_(lead.company, lead.location),
      lead.linkedinSearch || iwnLinkedInSearch_(lead.company),
      check.key,
      '',
      '',
      '',
      lead.source || ''
    ]);
    assignRows.push([
      new Date(), assignment.rep.name, leadId, lead.company,
      assignment.region, intent, lead.sourceUrl || '', lead.source || ''
    ]);
    iwnRegistryRecord_(registry, lead, check.key, leadId, true);
    distBySource[lead.source || 'Unknown'] = (distBySource[lead.source || 'Unknown'] || 0) + 1;
  });

  if (pipeRows.length) iwnAppend_(pipeline, pipeRows);
  if (assignRows.length) iwnAppend_(assignSheet, assignRows);
  iwnRecordSourcePerf_(distBySource, blockedBySource, leads.length);
  updateDailyTrackerMetrics();
  return pipeRows.length;
}

function iwnTodayOutboundCounts_() {
  const sheet = iwnSheet_(IWN.SHEETS.ASSIGNMENTS);
  const last = sheet.getLastRow();
  const counts = {};
  if (last < 2) return counts;
  const today = iwnToday_();
  const rows = sheet.getRange(2, 1, last - 1, 2).getValues();
  rows.forEach(function (row) {
    const d = row[0] instanceof Date
      ? Utilities.formatDate(row[0], iwnSetting_('TIMEZONE', 'Africa/Lagos'), 'yyyy-MM-dd')
      : String(row[0]);
    if (d === today) counts[row[1]] = (counts[row[1]] || 0) + 1;
  });
  return counts;
}

function clearTodayAssignments_(sheet, today) {
  const last = sheet.getLastRow();
  if (last < 2) return;
  const rows = sheet.getRange(2, 1, last - 1, IWN.HEADERS.ASSIGNMENTS.length).getValues();
  const keep = rows.filter(function (row) {
    const d = row[0] instanceof Date
      ? Utilities.formatDate(row[0], iwnSetting_('TIMEZONE', 'Africa/Lagos'), 'yyyy-MM-dd')
      : String(row[0]);
    return d !== today;
  });
  sheet.getRange(2, 1, last - 1, IWN.HEADERS.ASSIGNMENTS.length).clearContent();
  if (keep.length) sheet.getRange(2, 1, keep.length, keep[0].length).setValues(keep);
}

function bootstrapIfNeeded_() {
  if (!iwnSs_().getSheetByName(IWN.SHEETS.CONFIG)) bootstrapLeadEngineWorkbook();
}
