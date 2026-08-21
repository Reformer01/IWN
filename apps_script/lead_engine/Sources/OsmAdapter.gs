/**
 * OpenStreetMap Overpass — rotating amenity sweep by weekday + season.
 */

function osmFetchLeads_(limit) {
  limit = limit || 12;
  const boxes = iwnGetOsmBboxes_();
  if (!boxes.length) return [];

  const theme = osmThemeForToday_();
  const tz = iwnSetting_('TIMEZONE', 'Africa/Lagos');
  const dayIndex = Number(Utilities.formatDate(new Date(), tz, 'u')) - 1;
  const start = ((dayIndex % boxes.length) + boxes.length) % boxes.length;
  const ordered = boxes.slice(start).concat(boxes.slice(0, start));

  const leads = [];
  for (let i = 0; i < ordered.length && leads.length < limit; i++) {
    const box = ordered[i];
    const query = osmBuildQuery_(theme.key, box);
    let jsonText = '';
    try {
      const res = UrlFetchApp.fetch('https://overpass-api.de/api/interpreter', {
        method: 'post',
        payload: { data: query },
        muteHttpExceptions: true,
        followRedirects: true
      });
      if (res.getResponseCode() >= 200 && res.getResponseCode() < 400) {
        jsonText = res.getContentText();
      }
    } catch (err) {
      Logger.log('Overpass error: ' + err);
    }
    if (!jsonText) continue;
    let data;
    try { data = JSON.parse(jsonText); } catch (e) { continue; }
    const elements = (data && data.elements) || [];
    elements.forEach(function (el) {
      if (leads.length >= limit) return;
      const tags = el.tags || {};
      const name = tags.name || tags['name:en'];
      if (!name) return;
      leads.push({
        company: name,
        contact: tags.operator || theme.contact,
        email: tags.email || tags['contact:email'] || '',
        phone: tags.phone || tags['contact:phone'] || '',
        location: [box.city, box.state].join(', '),
        sector: theme.sector,
        sourceUrl: 'https://www.openstreetmap.org/' + (el.type || 'node') + '/' + el.id,
        intentTag: 'OSM Discovery',
        source: 'OSM',
        discoveredAt: new Date()
      });
    });
    Utilities.sleep(1100);
  }
  return leads;
}

function osmThemeForToday_() {
  const month = Number(Utilities.formatDate(new Date(), iwnSetting_('TIMEZONE', 'Africa/Lagos'), 'M'));
  const seasonal = iwnSeasonalTheme_(month);
  const tz = iwnSetting_('TIMEZONE', 'Africa/Lagos');
  const day = Number(Utilities.formatDate(new Date(), tz, 'u'));
  const rotation = [
    { key: 'hotel', sector: 'Hospitality', contact: 'General Manager / IT' },
    { key: 'school', sector: 'Education', contact: 'ICT Director / Principal' },
    { key: 'health', sector: 'Healthcare', contact: 'Head of IT / Admin' },
    { key: 'industry', sector: 'Industrial Manufacturing', contact: 'Plant / IT Manager' },
    { key: 'office', sector: 'Corporate / Finance', contact: 'CIO / Branch Manager' }
  ];
  if (seasonal && seasonal.osmKey) {
    return { key: seasonal.osmKey, sector: seasonal.sector, contact: seasonal.contact };
  }
  return rotation[(day - 1 + 5) % 5];
}

function osmBuildQuery_(themeKey, box) {
  const bbox = [box.south, box.west, box.north, box.east].join(',');
  const filters = {
    hotel: 'nwr["tourism"="hotel"](' + bbox + ');nwr["tourism"="guest_house"](' + bbox + ');',
    school: 'nwr["amenity"="school"]["name"](' + bbox + ');nwr["amenity"="university"](' + bbox + ');',
    health: 'nwr["amenity"="hospital"](' + bbox + ');nwr["amenity"="clinic"](' + bbox + ');',
    industry: 'nwr["landuse"="industrial"]["name"](' + bbox + ');nwr["man_made"="works"]["name"](' + bbox + ');',
    office: 'nwr["office"="company"]["name"](' + bbox + ');nwr["amenity"="bank"]["name"](' + bbox + ');'
  };
  const inner = filters[themeKey] || filters.office;
  return '[out:json][timeout:20];(' + inner + ');out center 15;';
}
