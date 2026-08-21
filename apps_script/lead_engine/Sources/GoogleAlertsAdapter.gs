/**
 * Google Alerts RSS URLs stored in 00 Config (Kind = ALERT).
 */

function googleAlertsFetchLeads_(limit) {
  limit = limit || 10;
  const feeds = iwnGetFeeds_('ALERT');
  const leads = [];
  const seen = {};

  feeds.forEach(function (feed) {
    if (leads.length >= limit) return;
    const xml = iwnSafeFetch_(feed.url);
    const items = iwnParseRssItems_(xml);
    items.forEach(function (item) {
      if (leads.length >= limit) return;
      const blob = item.title + ' ' + iwnStripHtml_(item.description);
      const company = rssExtractCompany_(item.title);
      if (!company || seen[company.toLowerCase()]) return;
      seen[company.toLowerCase()] = true;
      const competitive = /slow internet|spectranet|mtn business|complaint/i.test(blob);
      leads.push({
        company: company,
        contact: 'IT / Operations Lead',
        email: '',
        phone: '',
        location: rssExtractLocation_(blob),
        sector: rssInferSector_(blob),
        sourceUrl: item.link,
        intentTag: competitive ? 'Competitive Displacement' : 'New Business',
        source: 'GOOGLE_ALERTS',
        discoveredAt: new Date()
      });
    });
  });
  return leads;
}
