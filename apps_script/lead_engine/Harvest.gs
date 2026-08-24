/**
 * Orchestrate source adapters → raw sheet → pipeline.
 *
 * ACTIVE SOURCES:
 *  ✅ GOOGLE_PLACES  — Curated named companies (always runs first)
 *  ✅ OSM            — Real businesses from OpenStreetMap (hotels, factories, hospitals)
 *
 * DISABLED (noise / not real leads):
 *  ❌ RSS_NEWS       — Disabled (news headlines, not companies)
 *  ❌ GOOGLE_ALERTS  — Disabled (political/govt noise)
 *  ❌ JOBS           — Disabled (job postings, not companies)
 *  ❌ EVENTS         — Disabled (event announcements, not companies)
 */

function dailyLeadHarvest() {
  bootstrapIfNeeded_();
  if (!iwnIsWeekday_()) {
    Logger.log('Skipping harvest — weekend');
    return;
  }

  const quotaTotal = Number(iwnSetting_('DAILY_QUOTA_PER_REP', 8)) * Math.max(iwnGetReps_().length, 1);
  var harvested = [];

  // ── Source 1: CURATED TARGET ACCOUNTS (real named companies) ────────────────
  try {
    var targets = targetAccountsFetchLeads_(quotaTotal);
    harvested = harvested.concat(targets || []);
    Logger.log('TargetAccounts returned ' + (targets ? targets.length : 0) + ' leads');
  } catch (err) {
    Logger.log('TargetAccounts failed: ' + err);
  }

  // ── Source 2: OSM (real businesses from map data) ──────────────────────────
  if (harvested.length < quotaTotal) {
    try {
      var osmLeads = osmFetchLeads_(Math.max(6, quotaTotal - harvested.length));
      harvested = harvested.concat(osmLeads || []);
      Logger.log('OSM returned ' + (osmLeads ? osmLeads.length : 0) + ' leads');
    } catch (err) {
      Logger.log('OSM failed: ' + err);
    }
  }

  // ── Filter out any placeholder/dummy data ──────────────────────────────────
  harvested = harvested.filter(function (lead) {
    return lead && lead.company && !/800 IWN LEAD/i.test(lead.phone || '');
  });

  // ── Sort by coverage area (fiber-covered cities first) ─────────────────────
  if (iwnCoverageBoost_ && harvested.length) {
    harvested.sort(function (a, b) {
      return (iwnCoverageBoost_(b.location) ? 1 : 0) - (iwnCoverageBoost_(a.location) ? 1 : 0);
    });
  }

  // ── Write to raw sheet ─────────────────────────────────────────────────────
  var rawRows = harvested.map(function (lead) {
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
  var written = processRawInboundLeads();
  Logger.log('Harvest collected ' + harvested.length + ', pipeline wrote ' + written);
  return written;
}

function scrapeAndEnrichLeads() {
  dailyLeadHarvest();
}
