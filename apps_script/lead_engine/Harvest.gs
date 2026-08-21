/**
 * Orchestrate source adapters → raw sheet → pipeline.
 */

function dailyLeadHarvest() {
  bootstrapIfNeeded_();
  if (!iwnIsWeekday_()) {
    Logger.log('Skipping harvest — weekend');
    return;
  }

  const sources = iwnGetEnabledSources_();
  const seasonal = iwnSeasonalTheme_(Number(Utilities.formatDate(new Date(), iwnSetting_('TIMEZONE', 'Africa/Lagos'), 'M')));
  const quotaTotal = Number(iwnSetting_('DAILY_QUOTA_PER_REP', 8)) * Math.max(iwnGetReps_().length, 1);
  const perSource = Math.max(6, Math.ceil(quotaTotal / 3));

  const order = ['RSS_NEWS', 'GOOGLE_ALERTS', 'JOBS', 'EVENTS', 'OSM'];
  order.sort(function (a, b) {
    const wa = (sources[a] && sources[a].weight || 1) * (seasonal.boost && seasonal.boost[a] || 1);
    const wb = (sources[b] && sources[b].weight || 1) * (seasonal.boost && seasonal.boost[b] || 1);
    return wb - wa;
  });

  let harvested = [];
  order.forEach(function (id) {
    if (!sources[id] || !sources[id].enabled) return;
    if (harvested.length >= quotaTotal + 8) return;
    let batch = [];
    try {
      if (id === 'OSM') batch = osmFetchLeads_(perSource);
      else if (id === 'RSS_NEWS') batch = rssNewsFetchLeads_(perSource);
      else if (id === 'GOOGLE_ALERTS') batch = googleAlertsFetchLeads_(perSource);
      else if (id === 'JOBS') batch = jobSignalsFetchLeads_(perSource);
      else if (id === 'EVENTS') batch = eventsFetchLeadsAndOpportunities_(perSource);
    } catch (err) {
      Logger.log(id + ' failed: ' + err);
    }
    harvested = harvested.concat(batch || []);
  });

  harvested = harvested.filter(function (lead) {
    return lead && lead.company && !/800 IWN LEAD/i.test(lead.phone || '');
  });

  if (iwnCoverageBoost_ && harvested.length) {
    harvested.sort(function (a, b) {
      return (iwnCoverageBoost_(b.location) ? 1 : 0) - (iwnCoverageBoost_(a.location) ? 1 : 0);
    });
  }

  const rawRows = harvested.map(function (lead) {
    return [
      lead.discoveredAt || new Date(),
      lead.company,
      lead.contact || '',
      lead.email || '',
      lead.phone || '',
      lead.location || '',
      lead.sector || '',
      lead.source || '',
      lead.sourceUrl || '',
      lead.intentTag || '',
      ''
    ];
  });

  if (rawRows.length) iwnAppend_(iwnSheet_(IWN.SHEETS.RAW), rawRows);
  const written = processRawInboundLeads();
  Logger.log('Harvest collected ' + harvested.length + ', pipeline wrote ' + written);
  return written;
}

function scrapeAndEnrichLeads() {
  dailyLeadHarvest();
}
