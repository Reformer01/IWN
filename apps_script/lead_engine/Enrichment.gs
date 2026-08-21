/**
 * Light enrichment only — never invent phones/emails, never block a lead.
 */

function iwnEnrichLead_(lead, lookupBudget) {
  lead.mapsLink = iwnMapsLink_(lead.company, lead.location);
  lead.linkedinSearch = iwnLinkedInSearch_(lead.company);
  lead.suggestedPitch = iwnSuggestedPitch_(lead.sector, lead.intentTag);

  const hasContact = !!(lead.email || lead.phone);
  if (hasContact || lookupBudget.used >= lookupBudget.max) return lead;

  const key = String(iwnSetting_('CSE_API_KEY', '') || '').trim();
  const cx = String(iwnSetting_('CSE_CX', '') || '').trim();
  if (!key || !cx) return lead;

  lookupBudget.used++;
  const q = encodeURIComponent('"' + lead.company + '" contact Nigeria site:.ng');
  const url = 'https://www.googleapis.com/customsearch/v1?key=' + encodeURIComponent(key) +
    '&cx=' + encodeURIComponent(cx) + '&num=3&q=' + q;
  const jsonText = iwnSafeFetch_(url);
  if (!jsonText) return lead;
  let data;
  try { data = JSON.parse(jsonText); } catch (e) { return lead; }
  const items = (data.items || []);
  for (let i = 0; i < items.length; i++) {
    const pageUrl = items[i].link;
    if (!pageUrl) continue;
    const html = iwnSafeFetch_(pageUrl);
    if (!html) continue;
    if (!lead.email) {
      const em = html.match(/mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i) ||
        html.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
      if (em) lead.email = (em[1] || em[0]).replace(/^mailto:/i, '');
    }
    if (!lead.phone) {
      const tel = html.match(/tel:(\+?234[0-9]{7,10})/i) ||
        html.match(/\+234[\s-]?[0-9]{8,10}/);
      if (tel) lead.phone = tel[1] || tel[0];
    }
    if (lead.email || lead.phone) break;
  }
  return lead;
}

function iwnEnrichBatch_(leads) {
  const budget = { used: 0, max: Number(iwnSetting_('MAX_ENRICH_LOOKUPS_PER_RUN', 20)) };
  return leads.map(function (lead) {
    try {
      return iwnEnrichLead_(lead, budget);
    } catch (err) {
      Logger.log('Enrich skip: ' + err);
      lead.mapsLink = lead.mapsLink || iwnMapsLink_(lead.company, lead.location);
      lead.linkedinSearch = lead.linkedinSearch || iwnLinkedInSearch_(lead.company);
      return lead;
    }
  });
}
