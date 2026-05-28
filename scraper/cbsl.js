import axios from 'axios';
import * as cheerio from 'cheerio';
import { BROWSER_HEADERS, detectCurrencyKey } from './common.js';

/**
 * Helper to fetch and parse CBSL rates for a specific target date.
 * Submits the form data directly to the exrates_resultstt PHP endpoint.
 */
async function fetchCbslForDate(dateStr) {
  try {
    const url = 'https://www.cbsl.gov.lk/cbsl_custom/exratestt/exrates_resultstt.php';
    const params = new URLSearchParams();
    params.append('txtStart', dateStr);
    params.append('txtEnd', dateStr);
    params.append('rangeType', 'dates');
    params.append('lookupPage', 'lookup_daily_exchange_rates.php');
    params.append('startRange', '2006-11-11');
    params.append('submit_button', 'Submit');
    
    const currencies = [
      'AUD~Australian Dollar',
      'CAD~Canadian Dollar',
      'CHF~Swiss Franc',
      'CNY~Renminbi',
      'EUR~Euro',
      'GBP~British Pound',
      'JPY~Yen',
      'SGD~Singapore Dollar',
      'USD~United States Dollar'
    ];
    currencies.forEach(cur => {
      params.append('chk_cur[]', cur);
    });

    const { data: html } = await axios.post(url, params.toString(), {
      headers: {
        ...BROWSER_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://www.cbsl.gov.lk/cbsl_custom/exratestt/exratestt.php',
        'Origin': 'https://www.cbsl.gov.lk'
      },
      timeout: 15000
    });

    const $ = cheerio.load(html);
    const rates = {};

    $('table').each((_, table) => {
      const heading = $(table).parent().prevAll('h2').first().text().trim();
      const currencyCode = detectCurrencyKey(heading);
      if (!currencyCode) return;

      $(table).find('tbody tr').each((_, tr) => {
        const cells = [];
        $(tr).find('td').each((_, td) => {
          cells.push($(td).text().trim().replace(/,/g, ''));
        });

        if (cells.length < 3) return;

        const buy = parseFloat(cells[1]);
        const sell = parseFloat(cells[2]);

        if (!isNaN(buy) && buy > 0 && !isNaN(sell) && sell > 0) {
          rates[currencyCode] = { buy, sell };
        }
      });
    });

    return rates;
  } catch (err) {
    console.warn(`CBSL query failed for date ${dateStr}:`, err.message);
    return null;
  }
}

/**
 * Central Bank of Sri Lanka (CBSL) Exchange Rates Scraper
 * Queries the official PHP endpoint with a timezone-aware Colombo fallback search loop
 * to cleanly bypass WAF blocks and extract genuine buy and sell Telegraphic Transfer (TT) rates.
 */
export async function scrapeCbsl() {
  try {
    // Resolve Colombo timezone date
    const colomboDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' }));
    
    // Scan up to 5 days back to find the latest active business day (safely handles holidays/weekends)
    for (let i = 0; i < 5; i++) {
      const d = new Date(colomboDate);
      d.setDate(colomboDate.getDate() - i);
      
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      
      console.log(`Checking CBSL rates for date: ${dateStr}...`);
      const rates = await fetchCbslForDate(dateStr);
      
      if (rates && rates.USD && rates.USD.buy > 0) {
        console.log(`Successfully scraped CBSL rates for ${dateStr}:`, Object.keys(rates));
        return rates;
      }
    }
    
    throw new Error('No valid rate tables found in the last 5 days.');
  } catch (err) {
    console.error('Error in scrapeCbsl:', err.message);
    return null;
  }
}
