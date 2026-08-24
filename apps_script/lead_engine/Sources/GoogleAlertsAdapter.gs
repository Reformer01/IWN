/**
 * Google Alerts RSS adapter — STRICT noise filter.
 *
 * Google Alerts feeds deliver many irrelevant articles (political news,
 * health campaigns, crime reports) even when the search query is focused.
 * This adapter applies the SAME hard filters as RssNewsAdapter:
 *
 *  1. Title must NOT match noise keywords (political, govt, crime, health campaigns).
 *  2. The headline must reference an actual NAMED ENTITY that IWN can sell to:
 *     hotel, hospital, factory, school, company suffix, OR a competitor-displacement signal.
 *  3. Raw signal company name must be > 4 chars and not start with an article.
 *
 * Leads from this adapter ARE distributed to sales reps (source = 'GOOGLE_ALERTS').
 */

// ── Shared noise block (same as RssNewsAdapter) ───────────────────────────────
var GA_NOISE = /\b(governor|senate|senator|house of rep|assembly|minister|ministry|INEC|election|ballot|vote|court|verdict|conviction|murder|rape|robbery|kidnap|police|army|military|APC|PDP|Labour Party|Tinubu|Adeleke|Oyebanji|Abiodun|Soludo|Makinde|Sanwo[- ]?olu|FG |Federal Government|Presidency|EFCC|ICPC|DSS|NDLEA|malaria|cholera|HIV|COVID|flood|riot|protest|strike|NLC|pensioners?|obituary|death|burial|funeral|crash|accident|injury|award|recognition|birthday|special.?report|kwara|anambra|kano|abuja|kaduna|rivers|bayelsa|cross.river|enugu|imo|delta|edo|kogi|niger state|plateau|sokoto|taraba|zamfara|gombe|adamawa|borno|bauchi|jigawa|yobe|nasarawa|ekiti|benue)\b/i;

// ── Must match at least ONE of these to be a valid business target ─────────────
// Either a corporate entity type (hotel, factory, hospital etc.)
// OR a clear competitor displacement signal (complaint about slow internet, ISP switch)
var GA_ENTITY_REQUIRED = /\b(Ltd|Plc|Limited|Incorporated|Corp|Group|Holdings|Industries|Manufacturing|Hotels?|Hospital|Clinic|Schools?|University|College|Academy|Polytechnic|Factory|Plant|Estate|Properties|Farms?|Logistics|Breweries|Cement|Cables?|Foods?|Petroleum|Energy|Construction|Engineering|Telecoms?|Networks?|Technologies|Services?|Solutions?|Systems?|Ventures|Enterprises?|Associates|Partners|Consulting|Investments?|Capital|Finance|Bank|Insurance|Warehouse|Data\s+Centr[er])\b|slow\s+internet|poor\s+(connection|network)|switch(ing)?\s+(from|isp)|bad\s+network|Spectranet|MTN\s+business|Airtel\s+business|Glo\s+business|need\s+better\s+(internet|bandwidth)/i;

// ── At least one business-relevant action / signal ────────────────────────────
var GA_SIGNAL = /\b(opens?|launch(es|ed)?|expand(s|ed)?|inaugurat|commission(s|ed)?|new branch|new plant|new hotel|new factory|new office|new hospital|new school|new facility|to build|ground\s?breaking|unveil(s|ed)?|commence|acqui(res?|red?)|invest|partner|relocat|switch|complain|slow\s+internet|poor\s+network|disconnect|tender|procurement|rfq|expression\s+of\s+interest)\b/i;

// ── Southwest Nigeria city/state ──────────────────────────────────────────────
var GA_SW = /\b(lagos|ogun|oyo|osun|ondo|ibadan|abeokuta|osogbo|akure|sagamu|ijebu|mowe|ibafo|agbara|ilesa|ota|lekki|ikeja|apapa|ado[- ]?ekiti|ife|ore|owo|okitipupa)\b/i;

function googleAlertsFetchLeads_(limit) {
  limit = limit || 15;
  const feeds = iwnGetFeeds_('ALERT');
  const leads = [];
  const seen = {};

  feeds.forEach(function (feed) {
    if (leads.length >= limit) return;
    try {
      const xml = iwnSafeFetch_(feed.url);
      const items = iwnParseRssItems_(xml);
      items.forEach(function (item) {
        if (leads.length >= limit) return;

        const title = String(item.title || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        const desc  = iwnStripHtml_(item.description || '');
        const blob  = title + ' ' + desc;

        // ── Hard reject: political / government / health noise ────────────────
        if (GA_NOISE.test(title)) return;

        // ── Must have a SW Nigeria location ───────────────────────────────────
        if (!GA_SW.test(blob)) return;

        // ── Must have a business entity or competitor signal ──────────────────
        if (!GA_ENTITY_REQUIRED.test(blob)) return;

        // ── Must have at least one business action signal ─────────────────────
        if (!GA_SIGNAL.test(blob)) return;

        const competitive = /slow\s+internet|spectranet|mtn\s+business|airtel\s+business|glo\s+business|poor\s+(network|connection)|switch.*isp|bad\s+network/i.test(blob);
        const company = competitive
          ? gaExtractCompetitorAccount_(title, blob)
          : rssExtractCompany_(title);

        if (!company || company.length < 5) return;
        if (/^(The|A|An|In|At|On|By|For|Over|Nearly|About|More|Less)\b/i.test(company)) return;

        const key = company.toLowerCase().replace(/\s+/g, '');
        if (seen[key]) return;
        seen[key] = true;

        leads.push({
          company:      company,
          contact:      competitive ? 'IT Manager / Network Admin' : 'IT / Operations Lead',
          email:        '',
          phone:        '',
          location:     rssExtractLocation_(blob),
          sector:       rssInferSector_(blob),
          sourceUrl:    item.link,
          intentTag:    competitive ? 'Competitive Displacement' : 'New Business',
          source:       'GOOGLE_ALERTS',
          intelOnly:    false,  // these go to reps
          discoveredAt: new Date()
        });
      });
    } catch (e) {
      Logger.log('GoogleAlertsAdapter error: ' + e.message);
    }
  });

  return leads;
}

/**
 * For competitor displacement signals, try to extract the business NAME
 * (the company complaining, not the ISP name).
 */
function gaExtractCompetitorAccount_(title, blob) {
  // Try: "XYZ Hotel complains about slow internet in Ibadan"
  const m = title.match(/^(.{4,60}?)\s+(?:complain|switch|bad|slow|poor|need)/i);
  if (m) return m[1].trim();
  // Fall back to generic extraction
  return rssExtractCompany_(title);
}
