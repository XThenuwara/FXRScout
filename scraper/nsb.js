import * as cheerio from 'cheerio';
import { fetchHTML, detectCurrencyKey } from './common.js';

/**
 * Scrapes all available LKR exchange rates from NSB (National Savings Bank)
 * @returns {Promise<Object>} Scraped rate object
 */
export async function scrapeNsb() {
  const url = 'https://www.nsb.lk/rates-tarriffs/nsb-exchange-rates/';
  console.log(`Scraping NSB rates from: ${url}`);
  
  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);
    
    const scrapedRates = {};
    
    $('table').each((tIdx, tableEl) => {
      $(tableEl).find('tr').each((rIdx, trEl) => {
        const cells = [];
        $(trEl).find('td, th').each((cIdx, tdEl) => {
          cells.push($(tdEl).text().trim().replace(/\s+/g, ' '));
        });
        
        if (cells.length >= 4 && cells[1]) {
          const curKey = detectCurrencyKey(cells[1]);
          
          if (curKey) {
            const buy = parseFloat(cells[2].replace(/,/g, ''));
            const sell = parseFloat(cells[3].replace(/,/g, ''));
            
            if (!isNaN(buy) && !isNaN(sell) && buy > 0 && sell > 0) {
              scrapedRates[curKey] = { buy, sell };
            }
          }
        }
      });
    });
    
    if (scrapedRates.USD && scrapedRates.EUR) {
      console.log(`Successfully parsed NSB rates -> USD Buy: ${scrapedRates.USD.buy} Sell: ${scrapedRates.USD.sell}`);
      return scrapedRates;
    }
    
    throw new Error('Exchange rates not found in NSB tables.');
  } catch (err) {
    console.error('Error scraping NSB website:', err.message);
    return null;
  }
}

// Test runner for direct execution
const isDirectRun = process.argv[1] && (process.argv[1].endsWith('nsb.js') || process.argv[1].endsWith('nsb'));
if (isDirectRun) {
  console.log('Testing NSB scraper standalone...');
  scrapeNsb().then(rates => {
    console.log('Result:', rates);
  });
}
