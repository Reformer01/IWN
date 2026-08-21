/**
 * Business news RSS — expansion / opening / factory signals in SW Nigeria.
 */

var IWN_NEWS_KEYWORDS = /\b(opens?|launches?|expands?|inaugurat|new branch|factory|plant|hospital|school|hotel|estate|data centre|data center|commission)\b/i;
var IWN_SW_FILTER = /\b(lagos|ogun|oyo|osun|ondo|ibadan|abeokuta|osogbo|akure|sagamu|ijebu|mowe|ibafo|agbara|ilesa|ota|nigeria)\b/i;

function rssNewsFetchLeads_(limit) {
  limit = limit || 12;
  const feeds = iwnGetFeeds_('NEWS');
  const leads = [];
  const seen = {};

  feeds.forEach(function (feed) {
    if (leads.length >= limit) return;
    const xml = iwnSafeFetch_(feed.url);
    const items = iwnParseRssItems_(xml);
    items.forEach(function (item) {
      if (leads.length >= limit) return;
      const blob = (item.title + ' ' + iwnStripHtml_(item.description));
      if (!IWN_NEWS_KEYWORDS.test(blob)) return;
      if (!IWN_SW_FILTER.test(blob)) return;
      const company = rssExtractCompany_(item.title);
      if (!company || seen[company.toLowerCase()]) return;
      seen[company.toLowerCase()] = true;
      const location = rssExtractLocation_(blob);
      leads.push({
        company: company,
        contact: 'Decision Maker / IT Lead',
        email: '',
        phone: '',
        location: location,
        sector: rssInferSector_(blob),
        sourceUrl: item.link,
        intentTag: /tender|procurement|rfq/i.test(blob) ? 'Tender Mention' : 'Expansion Signal',
        source: 'RSS_NEWS',
        discoveredAt: new Date()
      });
    });
  });
  return leads;
}

function rssExtractCompany_(title) {
  const t = String(title || '').replace(/\s+/g, ' ').trim();
  const cut = t.split(/\s+[-–|:]\s+/)[0];
  const m = cut.match(/^(.{3,80}?)(?:\s+(?:opens|launches|expands|inaugurates|to build|unveils))/i);
  if (m) return m[1].replace(/^breaking:?\s*/i, '').trim();
  return cut.replace(/\s+(opens|launches|expands).*$/i, '').slice(0, 80).trim();
}

function rssExtractLocation_(text) {
  const m = String(text).match(/\b(Ibadan|Abeokuta|Osogbo|Akure|Sagamu|Ijebu[- ]?Ode|Mowe|Ibafo|Lagos|Agbara|Ilesa|Ota|Ogun|Oyo|Osun|Ondo)\b/i);
  return m ? m[0] : 'Southwest Nigeria';
}

function rssInferSector_(text) {
  const t = String(text).toLowerCase();
  if (/hotel|hospitality/.test(t)) return 'Hospitality';
  if (/school|university|education/.test(t)) return 'Education';
  if (/hospital|clinic|health/.test(t)) return 'Healthcare';
  if (/factory|cement|manufactur|plant|industrial/.test(t)) return 'Industrial Manufacturing';
  if (/bank|finance/.test(t)) return 'Finance';
  if (/estate|housing/.test(t)) return 'Estate / Campus';
  if (/gov|ministry/.test(t)) return 'Government';
  return 'Corporate / Industrial';
}
