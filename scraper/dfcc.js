import * as cheerio from 'cheerio';
import { fetchHTML, detectCurrencyKey } from './common.js';

/**
 * Scrapes all available LKR exchange rates from DFCC Bank
 * @returns {Promise<Object>} Scraped rate object
 */
export async function scrapeDfcc() {
  const url = 'https://www.dfcc.lk/rates-and-tariff/exchange-rates';
  console.log(`Scraping DFCC Bank rates from: ${url}`);
  
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
        
        if (cells.length >= 5 && cells[0]) {
          const curKey = detectCurrencyKey(cells[0].trim());
          if (curKey) {
            const buy = parseFloat(cells[3].replace(/,/g, ''));
            const sell = parseFloat(cells[4].replace(/,/g, ''));
            
            if (!isNaN(buy) && !isNaN(sell) && buy > 0 && sell > 0) {
              scrapedRates[curKey] = { buy, sell };
            }
          }
        }
      });
    });
    
    if (scrapedRates.USD && scrapedRates.EUR) {
      console.log(`Successfully parsed DFCC rates -> USD Buy: ${scrapedRates.USD.buy} Sell: ${scrapedRates.USD.sell}`);
      return scrapedRates;
    }
    
    throw new Error('Exchange rates not found in DFCC tables.');
  } catch (err) {
    console.error('Error scraping DFCC Bank website:', err.message);
    return null;
  }
}

// Test runner for direct execution
const isDirectRun = process.argv[1] && (process.argv[1].endsWith('dfcc.js') || process.argv[1].endsWith('dfcc'));
if (isDirectRun) {
  console.log('Testing DFCC scraper standalone...');
  scrapeDfcc().then(rates => {
    console.log('Result:', rates);
  });
}
