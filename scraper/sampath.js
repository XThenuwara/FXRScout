import axios from 'axios';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json'
};

/**
 * Scrapes USD to LKR buying and selling rates from Sampath Bank PLC JSON API
 * @returns {Promise<{buy: number, sell: number}>} Scraped rate object
 */
export async function scrapeSampath() {
  const url = 'https://www.sampath.lk/api/exchange-rates';
  console.log(`Scraping Sampath Bank rates from API: ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: BROWSER_HEADERS,
      timeout: 10000
    });
    
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      const scrapedRates = {};
      const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CHF', 'KWD', 'OMR', 'SAR', 'AED', 'QAR', 'JOD', 'BHD', 'INR', 'CAD', 'NZD'];
      
      currencies.forEach(cur => {
        const item = response.data.data.find(x => x.CurrCode === cur);
        if (item) {
          const buy = parseFloat(item.TTBUY);
          const sell = parseFloat(item.TTSEL);
          if (!isNaN(buy) && !isNaN(sell) && buy > 0 && sell > 0) {
            scrapedRates[cur] = { buy, sell };
          }
        }
      });
      
      if (scrapedRates.USD && scrapedRates.EUR) {
        console.log(`Successfully parsed Sampath rates -> USD Buy: ${scrapedRates.USD.buy} Sell: ${scrapedRates.USD.sell}`);
        return scrapedRates;
      }
    }
    
    throw new Error('Exchange rates not found in API response.');
  } catch (err) {
    console.error('Error scraping Sampath Bank website:', err.message);
    return null;
  }
}

// Test runner for direct execution
const isDirectRun = process.argv[1] && (process.argv[1].endsWith('sampath.js') || process.argv[1].endsWith('sampath'));
if (isDirectRun) {
  console.log('Testing Sampath scraper standalone...');
  scrapeSampath().then(rates => {
    console.log('Result:', rates);
  });
}
