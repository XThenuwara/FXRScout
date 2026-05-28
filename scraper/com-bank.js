import * as cheerio from 'cheerio';
import { fetchHTML, detectCurrencyKey } from './common.js';

/**
 * Scrapes all available LKR exchange rates from Commercial Bank of Sri Lanka
 * @returns {Promise<Object>} Scraped rate object maps standard currency keys to buy/sell
 */
export async function scrapeComBank() {
  const url = 'https://www.combank.lk/rates-tariff';
  console.log(`Scraping Commercial Bank rates from: ${url}`);
  
  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);
    
    const scrapedRates = {};
    
    // Scan all tables on the page to find the Exchange Rates table
    $('table').each((i, tableEl) => {
      const tableText = $(tableEl).text();
      // Ensure we only parse the main Exchange Rates table
      if (!tableText.includes('Exchange Rates') || !tableText.includes('Telegraphic Transfers')) {
        return;
      }

      $(tableEl).find('tr').each((rIdx, trEl) => {
        const cells = [];
        $(trEl).find('td').each((cIdx, tdEl) => {
          cells.push($(tdEl).text().trim().replace(/\s+/g, ' '));
        });
        
        if (cells.length > 0 && cells[0]) {
          const curKey = detectCurrencyKey(cells[0]);
          
          if (curKey) {
            let buy = 0;
            let sell = 0;
            
            // Columns structure verification:
            // Normally Cell 5 is TT Buying Rate and Cell 6 is TT Selling Rate
            if (cells.length >= 7) {
              buy = parseFloat(cells[5].replace(/,/g, ''));
              sell = parseFloat(cells[6].replace(/,/g, ''));
            } else if (cells.length >= 3) {
              buy = parseFloat(cells[1].replace(/,/g, ''));
              sell = parseFloat(cells[2].replace(/,/g, ''));
            }
            
            if (!isNaN(buy) && !isNaN(sell) && buy > 0 && sell > 0) {
              scrapedRates[curKey] = { buy, sell };
            }
          }
        }
      });
    });
    
    if (scrapedRates.USD && scrapedRates.EUR) {
      console.log(`Successfully parsed ComBank rates -> Harvester USD Buy: ${scrapedRates.USD.buy} Sell: ${scrapedRates.USD.sell}`);
      return scrapedRates;
    }
    
    throw new Error('Exchange rates not found in any page table.');
  } catch (err) {
    console.error('Error scraping Commercial Bank website:', err.message);
    return null; // Return null so the main loop can handle fallback
  }
}

// Test runner for direct execution
const isDirectRun = process.argv[1] && (process.argv[1].endsWith('com-bank.js') || process.argv[1].endsWith('com-bank'));
if (isDirectRun) {
  console.log('Testing ComBank scraper standalone...');
  scrapeComBank().then(rates => {
    console.log('Result:', rates);
  });
}

