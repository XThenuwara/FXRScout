import axios from 'axios';
import * as cheerio from 'cheerio';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

async function fetchHTML(url) {
  try {
    const res = await axios.get(url, { headers: BROWSER_HEADERS, timeout: 15000 });
    return res.data;
  } catch (err) {
    console.error(`Failed to fetch ${url}: ${err.message}`);
    return null;
  }
}

const banks = [
  { name: 'Sampath', url: 'https://www.sampath.lk/rates-and-charges?activeTab=exchange-rates' },
  { name: 'HNB', url: 'https://www.hnb.lk/exchange-rates' },
  { name: 'Peoples', url: 'https://www.peoplesbank.lk/exchange-rates/' },
  { name: 'Seylan', url: 'https://www.seylan.lk/exchange-rates' },
  { name: 'Union', url: 'https://www.unionb.com/exchange-rates/' },
  { name: 'Amana', url: 'https://www.amanabank.lk/business/treasury/exchange-rates.html' },
  { name: 'DFCC', url: 'https://www.dfcc.lk/rates-and-tariff/exchange-rates' },
  { name: 'NSB', url: 'https://www.nsb.lk/rates-tarriffs/nsb-exchange-rates/' },
  { name: 'PABC', url: 'https://www.pabcbank.com/treasury/exchange-rate/' },
  { name: 'NDB', url: 'https://www.ndbbank.com/rates/exchange-rates' }
];

async function discover() {
  for (const bank of banks) {
    console.log(`\n========================================`);
    console.log(`Testing ${bank.name} Bank: ${bank.url}`);
    console.log(`========================================`);
    const html = await fetchHTML(bank.url);
    if (!html) continue;

    const $ = cheerio.load(html);

    // Let's check for tables
    const tables = $('table');
    console.log(`Found ${tables.length} tables`);

    let foundUSD = false;

    // Search text containing USD or Dollar
    $('tr, div, li, p, td, span').each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text.includes('USD') || text.includes('US Dollar') || text.includes('U.S. Dollar')) {
        // limit logging to relevant matches
        if (text.length < 200 && text.toLowerCase().includes('buy') || text.toLowerCase().includes('sell') || /\b\d{3}\.\d{2,4}\b/.test(text)) {
          console.log(`Match standard text in ${el.tagName}: "${text.substring(0, 150)}"`);
        }
      }
    });

    tables.each((tIdx, tableEl) => {
      const rows = [];
      $(tableEl).find('tr').each((rIdx, trEl) => {
        const cells = [];
        $(trEl).find('td, th').each((cIdx, tdEl) => {
          cells.push($(tdEl).text().trim().replace(/\s+/g, ' '));
        });
        if (cells.length > 0) {
          const rowText = cells.join(' | ');
          if (rowText.toUpperCase().includes('USD') || rowText.toUpperCase().includes('U.S.D') || rowText.toUpperCase().includes('DOLLAR') || rowText.toUpperCase().includes('UNITED STATES')) {
            console.log(`Table ${tIdx} Row ${rIdx}: ${rowText}`);
            foundUSD = true;
          }
        }
      });
    });

    // Check if it has window.__NUXT__ or other state variables in scripts
    $('script').each((sIdx, scriptEl) => {
      const src = $(scriptEl).attr('src');
      const text = $(scriptEl).html() || '';
      if (text.includes('window.__NUXT__') || text.includes('__NEXT_DATA__') || text.includes('window.APP_STATE') || text.includes('exchangeRates') || text.includes('rates')) {
        console.log(`Found script with potential state data (length ${text.length}), src: ${src || 'inline'}`);
        if (text.includes('window.__NUXT__')) {
          console.log(`NUXT script preview: ${text.substring(0, 500)}`);
        }
      }
    });
  }
}

discover();
