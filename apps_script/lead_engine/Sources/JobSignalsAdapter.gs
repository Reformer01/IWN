/**
 * Hiring-IT proxy: companies posting network/IT roles in SW Nigeria.
 */

function jobSignalsFetchLeads_(limit) {
  limit = limit || 8;
  const feeds = iwnGetFeeds_('JOBS');
  const leads = [];
  const seen = {};

  feeds.forEach(function (feed) {
    if (leads.length >= limit) return;
    const xml = iwnSafeFetch_(feed.url);
    iwnParseRssItems_(xml).forEach(function (item) {
      if (leads.length >= limit) return;
      const blob = item.title + ' ' + iwnStripHtml_(item.description);
      if (!/IT Manager|Network Engineer|Systems Admin|Head of IT|ICT|digital transformation/i.test(blob)) return;
      const company = jobExtractEmployer_(item.title, blob);
      if (!company || seen[company.toLowerCase()]) return;
      seen[company.toLowerCase()] = true;
      leads.push({
        company: company,
        contact: 'Hiring Manager / Head of IT',
        email: '',
        phone: '',
        location: rssExtractLocation_(blob),
        sector: rssInferSector_(blob),
        sourceUrl: item.link,
        intentTag: 'Hiring IT — Warm',
        source: 'JOBS',
        discoveredAt: new Date()
      });
    });
  });
  return leads;
}

function jobExtractEmployer_(title, blob) {
  const at = String(title).match(/\bat\s+([A-Z][^|–-]{2,60})/i);
  if (at) return at[1].trim();
  const dash = String(title).split(/\s[-–|]\s/);
  if (dash.length > 1) return dash[dash.length - 1].replace(/hiring.*/i, '').trim().slice(0, 80);
  return rssExtractCompany_(title);
}
