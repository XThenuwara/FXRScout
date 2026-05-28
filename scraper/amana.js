import * as cheerio from 'cheerio';
import { fetchHTML, detectCurrencyKey } from './common.js';

/**
 * Scrapes all available LKR exchange rates from Amana Bank
 * @returns {Promise<Object>} Scraped rate object
 */
export async function scrapeAmana() {
  const url = 'https://www.amanabank.lk/business/treasury/exchange-rates.html';
  console.log(`Scraping Amana Bank rates from: ${url}`);
  
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
        
        if (cells.length >= 3 && cells[0]) {
          const curKey = detectCurrencyKey(cells[0].trim());
          
          if (curKey) {
            const buy = parseFloat(cells[1].replace(/,/g, ''));
            const sell = parseFloat(cells[2].replace(/,/g, ''));
            
            if (!isNaN(buy) && !isNaN(sell) && buy > 0 && sell > 0) {
              scrapedRates[curKey] = { buy, sell };
            }
          }
        }
      });
    });
    
    if (scrapedRates.USD && scrapedRates.EUR) {
      console.log(`Successfully parsed Amana Bank rates -> USD Buy: ${scrapedRates.USD.buy} Sell: ${scrapedRates.USD.sell}`);
      return scrapedRates;
    }
    
    throw new Error('Exchange rates not found in Amana Bank tables.');
  } catch (err) {
    console.error('Error scraping Amana Bank website:', err.message);
    return null;
  }
}

// Test runner for direct execution
const isDirectRun = process.argv[1] && (process.argv[1].endsWith('amana.js') || process.argv[1].endsWith('amana'));
if (isDirectRun) {
  console.log('Testing Amana scraper standalone...');
  scrapeAmana().then(rates => {
    console.log('Result:', rates);
  });
}
