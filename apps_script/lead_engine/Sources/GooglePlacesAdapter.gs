/**
 * =============================================================================
 * I-WORLD NETWORKS — GOOGLE PLACES API (NEW) LIVE HARVEST ADAPTER
 * =============================================================================
 * Live Text Search adapter connecting directly to Google Places API (New):
 * Endpoint: https://places.googleapis.com/v1/places:searchText
 *
 * Features:
 *  - Automated City x Sector query matrix covering Southwest Nigeria
 *  - Custom search query overrides in 00 Config
 *  - Field masking to strictly request Contact/Basic fields (cost-optimized)
 *  - Real-time deduplication checking against 05 Lead Registry
 *  - Verified phone numbers, formatted addresses, websites, and Google Maps links
 * =============================================================================
 */

function googlePlacesFetchLeads_(limit) {
  limit = limit || 16;
  const apiKey = iwnGetPlacesApiKey_();
  if (!apiKey) {
    Logger.log('GooglePlacesAdapter: No API Key found in ScriptProperties or Config.');
    return [];
  }

  const query = googlePlacesPickQueryForToday_();
  if (!query) {
    Logger.log('GooglePlacesAdapter: No query generated.');
    return [];
  }

  Logger.log('GooglePlacesAdapter: Executing query -> ' + query);

  const endpoint = 'https://places.googleapis.com/v1/places:searchText';
  const fieldMask = [
    'places.displayName',
    'places.formattedAddress',
    'places.nationalPhoneNumber',
    'places.internationalPhoneNumber',
    'places.websiteUri',
    'places.googleMapsUri',
    'places.businessStatus',
    'places.primaryType'
  ].join(',');

  const payload = {
    textQuery: query,
    pageSize: Math.min(20, Math.max(limit * 2, 10)),
    languageCode: 'en'
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  let res;
  try {
    res = UrlFetchApp.fetch(endpoint, options);
  } catch (err) {
    Logger.log('GooglePlacesAdapter: UrlFetch error: ' + err);
    return [];
  }

  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    Logger.log('GooglePlacesAdapter HTTP ' + code + ': ' + res.getContentText());
    return [];
  }

  let data;
  try {
    data = JSON.parse(res.getContentText());
  } catch (e) {
    Logger.log('GooglePlacesAdapter: Failed to parse JSON response.');
    return [];
  }

  const places = (data && data.places) || [];
  if (!places.length) {
    Logger.log('GooglePlacesAdapter: 0 places returned for query: ' + query);
    return [];
  }

  const registry = iwnLoadRegistry_();
  const leads = [];

  for (let i = 0; i < places.length && leads.length < limit; i++) {
    const p = places[i];
    // Must be currently operational
    if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue;

    const name = (p.displayName && p.displayName.text) ? p.displayName.text.trim() : '';
    if (!name || name.length < 3) continue;

    const address = p.formattedAddress || '';
    const phone = p.nationalPhoneNumber || p.internationalPhoneNumber || '';
    const website = p.websiteUri || '';
    const mapsUri = p.googleMapsUri || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(name + ' ' + address));
    const sector = googlePlacesDetectSector_(p.primaryType, name, query);

    const dummyLead = {
      company: name,
      location: address,
      sector: sector
    };

    const check = iwnRegistryCheck_(registry, dummyLead);
    if (!check.accept) {
      Logger.log('GooglePlaces: Blocked duplicate in registry -> ' + name);
      continue;
    }

    const linkedinLink = 'https://www.linkedin.com/search/results/companies/?keywords=' + encodeURIComponent(name);

    leads.push({
      company:        name,
      contact:        'General Manager / IT Director',
      email:          '',
      phone:          phone,
      location:       address,
      sector:         sector,
      sourceUrl:      website || mapsUri,
      mapsLink:       mapsUri,
      linkedinSearch: linkedinLink,
      intentTag:      'Live Places Discovery',
      source:         'GOOGLE_PLACES',
      intelOnly:      false,
      discoveredAt:   new Date()
    });
  }

  Logger.log('GooglePlacesAdapter: Harvested ' + leads.length + ' fresh operational commercial leads.');
  return leads;
}

/**
 * Rotate through coverage locations and commercial sectors
 */
function googlePlacesPickQueryForToday_() {
  // Check if there are custom override queries in Config first
  const custom = iwnGetPlacesCustomQueries_();
  const tz = iwnSetting_('TIMEZONE', 'Africa/Lagos');
  const dayOfYear = Number(Utilities.formatDate(new Date(), tz, 'D'));

  if (custom && custom.length) {
    return custom[dayOfYear % custom.length];
  }

  const cities = [
    'Ibadan, Oyo State, Nigeria',
    'Abeokuta, Ogun State, Nigeria',
    'Sagamu & Ijebu-Ode, Ogun State, Nigeria',
    'Agbara Industrial Estate & Ota, Ogun State, Nigeria',
    'Osogbo, Osun State, Nigeria',
    'Akure, Ondo State, Nigeria',
    'Ikeja & Ikeja GRA, Lagos, Nigeria',
    'Lekki Phase 1 & Victoria Island, Lagos, Nigeria'
  ];

  const sectors = [
    'manufacturing companies OR factories OR industrial plants in ',
    'private hospitals OR specialist clinics OR medical diagnostic centers in ',
    'hotels OR resorts OR conference centres in ',
    'private universities OR colleges OR academies in ',
    'shopping malls OR commercial plazas OR supermarkets in ',
    'corporate headquarters OR logistics hubs OR finance companies in ',
    'tech hubs OR coworking spaces OR corporate offices in '
  ];

  const cityIdx = dayOfYear % cities.length;
  const sectorIdx = (dayOfYear + Math.floor(dayOfYear / cities.length)) % sectors.length;

  return sectors[sectorIdx] + cities[cityIdx];
}

/**
 * Categorize primary type or query into clean B2B sector label
 */
function googlePlacesDetectSector_(primaryType, name, query) {
  const blob = ((primaryType || '') + ' ' + (name || '') + ' ' + (query || '')).toLowerCase();
  if (/hotel|resort|lodge|guest|motel|hospitality/.test(blob)) return 'Hospitality';
  if (/hospital|clinic|medical|health|diagnostic|pharm/.test(blob)) return 'Healthcare';
  if (/school|college|academy|university|education|polytechnic/.test(blob)) return 'Education';
  if (/manufactur|factory|plant|industrial|mill|industry/.test(blob)) return 'Industrial / Manufacturing';
  if (/mall|supermarket|plaza|mart|retail|store/.test(blob)) return 'Commercial / Retail Complex';
  if (/bank|finance|fintech|microfinance|capital|invest/.test(blob)) return 'Financial Services';
  if (/logistics|warehouse|freight|courier|transport/.test(blob)) return 'Logistics / Supply Chain';
  return 'Corporate / Enterprise';
}
