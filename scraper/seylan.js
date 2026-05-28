import * as cheerio from 'cheerio';
import { fetchHTML, detectCurrencyKey } from './common.js';

/**
 * Scrapes all available LKR exchange rates from Seylan Bank
 * @returns {Promise<Object>} Scraped rate object
 */
export async function scrapeSeylan() {
  const url = 'https://www.seylan.lk/exchange-rates';
  console.log(`Scraping Seylan Bank rates from: ${url}`);
  
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
      console.log(`Successfully parsed Seylan rates -> USD Buy: ${scrapedRates.USD.buy} Sell: ${scrapedRates.USD.sell}`);
      return scrapedRates;
    }
    
    throw new Error('Exchange rates not found in Seylan tables.');
  } catch (err) {
    console.error('Error scraping Seylan Bank website:', err.message);
    return null;
  }
}

// Test runner for direct execution
const isDirectRun = process.argv[1] && (process.argv[1].endsWith('seylan.js') || process.argv[1].endsWith('seylan'));
if (isDirectRun) {
  console.log('Testing Seylan scraper standalone...');
  scrapeSeylan().then(rates => {
    console.log('Result:', rates);
  });
}
