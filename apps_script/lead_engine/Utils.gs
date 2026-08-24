/**
 * Shared helpers for the Lead Engine.
 */

function iwnSs_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function iwnSheet_(name) {
  const ss = iwnSs_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    bootstrapLeadEngineWorkbook();
    sheet = ss.getSheetByName(name);
  }
  return sheet;
}

function iwnAppend_(sheet, rows) {
  if (!rows || !rows.length) return;
  const start = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(start, 1, rows.length, rows[0].length).setValues(rows);
}

function iwnToday_() {
  const tz = iwnSetting_('TIMEZONE', Session.getScriptTimeZone() || 'Africa/Lagos');
  return Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
}

function iwnIsWeekday_(date) {
  const d = date || new Date();
  const tz = iwnSetting_('TIMEZONE', 'Africa/Lagos');
  const day = Number(Utilities.formatDate(d, tz, 'u')); // 1=Mon … 7=Sun
  return day >= 1 && day <= 5;
}

function iwnNextLeadId_() {
  const props = PropertiesService.getScriptProperties();
  const n = Number(props.getProperty('LEAD_SEQ') || '1000') + 1;
  props.setProperty('LEAD_SEQ', String(n));
  return 'IWN-' + n;
}

function iwnSafeFetch_(url, options) {
  options = options || {};
  try {
    const res = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      timeout: options.timeout || 20,
      headers: options.headers || { 'User-Agent': 'IWN-LeadEngine/2.0' }
    });
    const code = res.getResponseCode();
    if (code >= 200 && code < 400) return res.getContentText();
    Logger.log('Fetch ' + code + ' for ' + url);
    return '';
  } catch (err) {
    Logger.log('Fetch error ' + url + ': ' + err);
    return '';
  }
}

function iwnParseRssItems_(xmlText) {
  const items = [];
  if (!xmlText) return items;
  try {
    const doc = XmlService.parse(xmlText);
    const root = doc.getRootElement();
    const rootName = root.getName();

    if (rootName === 'rss' || rootName === 'RDF') {
      const channel = root.getChild('channel') || root;
      const children = channel.getChildren('item');
      children.forEach(function (item) {
        items.push({
          title: textOf_(item, 'title'),
          link: textOf_(item, 'link'),
          description: textOf_(item, 'description') || textOf_(item, 'summary'),
          pubDate: textOf_(item, 'pubDate') || textOf_(item, 'date')
        });
      });
    } else if (rootName === 'feed') {
      const atom = root.getNamespace();
      root.getChildren('entry', atom).forEach(function (entry) {
        const linkEl = entry.getChild('link', atom);
        items.push({
          title: entry.getChildText('title', atom) || '',
          link: (linkEl && linkEl.getAttribute('href')) ? linkEl.getAttribute('href').getValue() : '',
          description: entry.getChildText('summary', atom) || entry.getChildText('content', atom) || '',
          pubDate: entry.getChildText('updated', atom) || entry.getChildText('published', atom) || ''
        });
      });
    }
  } catch (err) {
    Logger.log('RSS parse error: ' + err);
  }
  return items;
}

function textOf_(el, name) {
  const child = el.getChild(name);
  return child ? child.getText() : '';
}

function iwnStripHtml_(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

function iwnMapsLink_(company, location) {
  const q = encodeURIComponent([company, location, 'Nigeria'].filter(Boolean).join(' '));
  return 'https://www.google.com/maps/search/?api=1&query=' + q;
}

function iwnLinkedInSearch_(company) {
  return 'https://www.linkedin.com/search/results/companies/?keywords=' + encodeURIComponent(company || '');
}

function iwnSuggestedPitch_(sector, intent) {
  const s = String(sector || '').toLowerCase();
  const i = String(intent || '').toLowerCase();
  if (/hotel|hospitality|resort|motel|inn|chill spot/.test(s)) {
    return 'Hotel / Guest Wi-Fi portal + dedicated low-latency metro fibre';
  }
  if (/school|edu|university|college|polytechnic|academy/.test(s)) {
    return 'Campus e-Learning fibre + Google Workspace / NGFEP bundle';
  }
  if (/hospital|health|clinic|pharmacy|diagnostic/.test(s)) {
    return 'Telemedicine dedicated link + uninterrupted POS & inventory sync';
  }
  if (/supermarket|mart|mall|retail|shop|gadget/.test(s)) {
    return 'Multi-till POS continuity, CCTV backup & cloud inventory fibre';
  }
  if (/restaurant|eatery|cafe|fast food/.test(s)) {
    return 'Customer guest Wi-Fi hotspot + seamless POS & online delivery link';
  }
  if (/event|church|auditorium|worship|banquet/.test(s)) {
    return 'High-density audience Wi-Fi + dedicated live-streaming uplink';
  }
  if (/bank|microfinance|finance|fintech/.test(s)) {
    return 'Secure encrypted inter-branch data link + 99.9% uptime SLA';
  }
  if (/law|legal|consulting|firm|corporate|plaza/.test(s)) {
    return 'Dedicated office metro fibre + cloud legal document sync & VoIP';
  }
  if (/gov|parastatal|ministry|agency|revenue/.test(s)) {
    return 'Government e-Tax portal dedicated link + secure intranet connectivity';
  }
  if (/factory|manufactur|industrial|plant|processing/.test(s)) {
    return 'Enterprise dedicated metro fibre for SCADA & plant operations';
  }
  if (/tech hub|cyber cafe|coworking/.test(s)) {
    return 'High-capacity symmetric fibre for multi-user downloads & coding';
  }
  if (/inbound/.test(i)) {
    return 'Quote + free site survey — priority inbound inquiry';
  }
  return 'U-Lite SME or dedicated metro fibre — coverage check';
}

function iwnLogDist_(type, recipient, count, messageId, notes) {
  iwnAppend_(iwnSheet_(IWN.SHEETS.DIST_LOG), [[
    new Date(), type, recipient, count, messageId || '', notes || ''
  ]]);
}
