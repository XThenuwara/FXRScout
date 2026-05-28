import * as cheerio from 'cheerio';
import { fetchHTML, detectCurrencyKey } from './common.js';

/**
 * Scrapes all available LKR exchange rates from NDB Bank
 * @returns {Promise<Object>} Scraped rate object
 */
export async function scrapeNdb() {
  const url = 'https://www.ndbbank.com/rates/exchange-rates';
  console.log(`Scraping NDB Bank rates from: ${url}`);
  
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
        
        if (cells.length >= 8 && cells[1]) {
          const curKey = detectCurrencyKey(cells[1].trim());
          if (curKey) {
            const buy = parseFloat(cells[6].replace(/,/g, ''));
            const sell = parseFloat(cells[7].replace(/,/g, ''));
            
            if (!isNaN(buy) && !isNaN(sell) && buy > 0 && sell > 0) {
              scrapedRates[curKey] = { buy, sell };
            }
          }
        }
      });
    });
    
    if (scrapedRates.USD && scrapedRates.EUR) {
      console.log(`Successfully parsed NDB rates -> USD Buy: ${scrapedRates.USD.buy} Sell: ${scrapedRates.USD.sell}`);
      return scrapedRates;
    }
    
    throw new Error('Exchange rates not found in NDB tables.');
  } catch (err) {
    console.error('Error scraping NDB Bank website:', err.message);
    return null;
  }
}

// Test runner for direct execution
const isDirectRun = process.argv[1] && (process.argv[1].endsWith('ndb.js') || process.argv[1].endsWith('ndb'));
if (isDirectRun) {
  console.log('Testing NDB scraper standalone...');
  scrapeNdb().then(rates => {
    console.log('Result:', rates);
  });
}
