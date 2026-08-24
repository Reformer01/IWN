/**
 * Business news RSS — STRICT named corporate entity filter.
 *
 * RULES:
 *  1. Title must contain a named company (Ltd, Plc, Hotels, Industries, etc.)
 *     OR a recognised venue word (factory, plant, hospital, hotel, school, estate)
 *     that is immediately anchored to a proper noun.
 *  2. Title must contain at least ONE expansion/action keyword.
 *  3. Title must reference a Southwest Nigeria city/state.
 *  4. Title must NOT match any NOISE patterns (political, government, FG, INEC,
 *     governor, minister, senator, police, army, court, verdict, etc.).
 *  5. Leads are tagged source = 'RSS_NEWS' and intelOnly = true.
 *     They are NOT distributed to sales reps — only sent to Reformer.
 */

// ── Must appear in title for the article to be a business target ──────────────
var IWN_COMPANY_SUFFIX = /\b(Ltd|Plc|Limited|Incorporated|Corp|Nigeria|Group|Holdings|Industries|Manufacturing|Hotels?|Hospital|Clinic|Schools?|University|College|Academy|Polytechnic|Factory|Plant|Estate|Properties|Farms?|Logistics|Breweries|Cement|Cables?|Foods?|Petroleum|Energy|Construction|Engineering|Telecoms?|Networks?|Technologies|Services?|Solutions?|Systems?|Ventures|Enterprises?|Associates|Partners|Consulting|Investments?|Capital|Finance|Bank|Insurance)\b/i;

// ── Expansion/action signal — must be present ─────────────────────────────────
var IWN_ACTION_KEYWORDS = /\b(opens?|open|launch(es|ed)?|expand(s|ed)?|inaugurat(es|ed)?|commission(s|ed)?|new branch|new plant|new factory|new hotel|new office|new hospital|new school|new facility|new building|to build|breaks? ground|groundbreaking|unveil(s|ed)?|begin(s)? operations?|commence(s|d)?|acqui(res?|red?)|invest(s|ed)?|partner(s|ed)?)\b/i;

// ── Must mention a Southwest Nigeria location ─────────────────────────────────
var IWN_SW_CITIES = /\b(lagos|ogun|oyo|osun|ondo|ibadan|abeokuta|osogbo|akure|sagamu|ijebu|mowe|ibafo|agbara|ilesa|ota|lekki|ikeja|apapa|badagry|ado[- ]?ekiti|ondo[- ]?town|ife|ore|okitipupa|owo)\b/i;

// ── Noise patterns — political, government, crime, sports, health awareness ───
var IWN_NOISE = /\b(governor|senate|senator|house of rep|assembly|minister|ministry|INEC|election|ballot|vote|court|verdict|conviction|murder|rape|robbery|kidnap|police|army|military|APC|PDP|Labour Party|Tinubu|Adeleke|Oyebanji|Abiodun|Soludo|Makinde|Sanwo[- ]?olu|FG |Federal Government|Presidency|EFCC|ICPC|DSS|NDLEA|malaria|cholera|HIV|COVID|flood|riot|protest|strike|NLC|pensioners?|obituary|death|burial|funeral|crash|accident|injury|award|recognition|birthday|inaugur.*office)\b/i;

// ── Absolute minimum: title must include a real entity or venue word ──────────
var IWN_ENTITY_REQUIRED = /\b(Ltd|Plc|Limited|Incorporated|Corp|Hotels?|Hospital|Clinic|Factory|Plant|School|University|College|Polytechnic|Estate|Industries|Breweries|Cement|Cables?|Petroleum|Construction|Logistics|Engineering|Farms?)\b/i;

function rssNewsFetchLeads_(limit) {
  limit = limit || 10;
  const feeds = iwnGetFeeds_('NEWS');
  const leads = [];
  const seen = {};

  feeds.forEach(function (feed) {
    if (leads.length >= limit) return;
    try {
      const xml = iwnSafeFetch_(feed.url);
      const items = iwnParseRssItems_(xml);
      items.forEach(function (item) {
        if (leads.length >= limit) return;
        const title = String(item.title || '').replace(/\s+/g, ' ').trim();
        const desc  = iwnStripHtml_(item.description || '');
        const blob  = title + ' ' + desc;

        // ── Hard filters ──────────────────────────────────────────────────────
        if (IWN_NOISE.test(title))                  return;  // political / govt noise
        if (!IWN_ACTION_KEYWORDS.test(blob))        return;  // no expansion signal
        if (!IWN_SW_CITIES.test(blob))              return;  // not in territory
        if (!IWN_ENTITY_REQUIRED.test(title))       return;  // no named company/entity type in title
        // ─────────────────────────────────────────────────────────────────────

        const company = rssExtractCompany_(title);
        if (!company || company.length < 5)         return;  // too short = likely garbage
        if (/^(The|A|An|In|At|On|By|For)\b/i.test(company)) return; // starts with article

        const key = company.toLowerCase().replace(/\s+/g, '');
        if (seen[key]) return;
        seen[key] = true;

        const location = rssExtractLocation_(blob);
        leads.push({
          company:     company,
          contact:     'Decision Maker / IT Lead',
          email:       '',
          phone:       '',
          location:    location,
          sector:      rssInferSector_(blob),
          sourceUrl:   item.link,
          intentTag:   /tender|procurement|rfq/i.test(blob) ? 'Tender Mention' : 'Expansion Signal',
          source:      'RSS_NEWS',
          intelOnly:   true,   // ← NEVER goes to reps, only to Reformer
          discoveredAt: new Date()
        });
      });
    } catch (e) {
      Logger.log('RssNewsAdapter error for ' + feed.url + ': ' + e.message);
    }
  });

  return leads;
}

function rssExtractCompany_(title) {
  const t = String(title || '').replace(/\s+/g, ' ').trim();
  // Case 1: "CompanyName opens / launches / expands…"
  const m = t.match(/^(.{4,80}?)\s+(?:opens?|launch|expand|inaugurat|commission|unveil|breaks?\s+ground|groundbreaking|to build|new\s+\w+)/i);
  if (m) return m[1].replace(/^(?:breaking:?|watch:?|exclusive:?)\s*/i, '').trim();
  // Case 2: Take everything before a dash/colon separator
  const parts = t.split(/\s+[-–|:]\s+/);
  return parts[0].slice(0, 80).trim();
}

function rssExtractLocation_(text) {
  const m = String(text).match(/\b(Ibadan|Abeokuta|Osogbo|Akure|Sagamu|Ijebu[- ]?Ode|Mowe|Ibafo|Lagos|Agbara|Ilesa|Ota|Lekki|Ikeja|Apapa|Ogun|Oyo|Osun|Ondo)\b/i);
  return m ? m[0] : 'Southwest Nigeria';
}

function rssInferSector_(text) {
  const t = String(text).toLowerCase();
  if (/hotel|hospitality|resort|suites?/.test(t)) return 'Hospitality';
  if (/school|university|college|polytechnic|academy/.test(t)) return 'Education';
  if (/hospital|clinic|health|medical|diagnostic/.test(t)) return 'Healthcare';
  if (/factory|cement|manufactur|plant|industrial|cables?|breweries/.test(t)) return 'Industrial Manufacturing';
  if (/bank|finance|insurance|microfinance/.test(t)) return 'Finance';
  if (/estate|housing|property|properties/.test(t)) return 'Real Estate';
  if (/petroleum|oil|energy|power|solar/.test(t)) return 'Energy / Petroleum';
  if (/logistics|shipping|port|freight/.test(t)) return 'Logistics';
  return 'Corporate / Industrial';
}
