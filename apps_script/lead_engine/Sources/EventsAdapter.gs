/**
 * Events, trade fairs, tenders — write Opportunity Radar + exhibitor-style leads.
 */

function eventsFetchLeadsAndOpportunities_(limit) {
  limit = limit || 8;
  const feeds = iwnGetFeeds_('EVENTS');
  const leads = [];
  const opportunities = [];
  const seen = {};

  feeds.forEach(function (feed) {
    const xml = iwnSafeFetch_(feed.url);
    iwnParseRssItems_(xml).forEach(function (item) {
      const blob = item.title + ' ' + iwnStripHtml_(item.description);
      if (!/fair|expo|summit|tender|procurement|chamber|conference|exhibition/i.test(blob)) return;
      const location = rssExtractLocation_(blob);
      const eventDate = eventsGuessDate_(blob, item.pubDate);
      opportunities.push([
        eventDate,
        item.title.slice(0, 180),
        location,
        iwnTerritoryFromLocation_(location).territory,
        /tender|procurement|rfq/i.test(blob) ? 'Tender / RFQ' : 'Event / Expo',
        item.link,
        '',
        iwnStripHtml_(item.description).slice(0, 180)
      ]);

      if (leads.length >= limit) return;
      const company = rssExtractCompany_(item.title);
      if (!company || seen[company.toLowerCase()]) return;
      seen[company.toLowerCase()] = true;
      leads.push({
        company: company,
        contact: 'Organiser / Sponsor / IT',
        email: '',
        phone: '',
        location: location,
        sector: rssInferSector_(blob),
        sourceUrl: item.link,
        intentTag: /tender|procurement/i.test(blob) ? 'Tender Mention' : 'Event Prospect',
        source: 'EVENTS',
        discoveredAt: new Date()
      });
    });
  });

  if (opportunities.length) {
    const sheet = iwnSheet_(IWN.SHEETS.EVENTS);
    const withCountdown = opportunities.map(function (row) {
      const d = row[0] instanceof Date ? row[0] : new Date(row[0]);
      const days = isNaN(d.getTime()) ? '' : Math.round((d.getTime() - Date.now()) / 86400000);
      row[6] = days;
      return row;
    });
    iwnAppend_(sheet, withCountdown);
  }

  return leads;
}

function eventsGuessDate_(blob, pubDate) {
  const iso = String(blob).match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return new Date(iso[1]);
  if (pubDate) {
    const d = new Date(pubDate);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}
