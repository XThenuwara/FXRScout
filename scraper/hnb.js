import axios from 'axios';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json'
};

/**
 * Scrapes USD to LKR buying and selling rates from Hatton National Bank Venus API
 * @returns {Promise<{buy: number, sell: number}>} Scraped rate object
 */
export async function scrapeHnb() {
  const url = 'https://venus.hnb.lk/api/get_exchange_rates_contents_web';
  console.log(`Scraping HNB rates from API: ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: BROWSER_HEADERS,
      timeout: 10000
    });
    
    if (Array.isArray(response.data)) {
      const scrapedRates = {};
      const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CHF', 'KWD', 'OMR', 'SAR', 'AED', 'QAR', 'JOD', 'BHD', 'INR', 'CAD', 'NZD'];
      
      currencies.forEach(cur => {
        const item = response.data.find(x => x.currencyCode === cur);
        if (item) {
          const buy = parseFloat(item.buyingRate);
          const sell = parseFloat(item.sellingRate);
          if (!isNaN(buy) && !isNaN(sell) && buy > 0 && sell > 0) {
            scrapedRates[cur] = { buy, sell };
          }
        }
      });
      
      if (scrapedRates.USD && scrapedRates.EUR) {
        console.log(`Successfully parsed HNB rates -> USD Buy: ${scrapedRates.USD.buy} Sell: ${scrapedRates.USD.sell}`);
        return scrapedRates;
      }
    }
    
    throw new Error('Exchange rates not found in Venus API response.');
  } catch (err) {
    console.error('Error scraping HNB website:', err.message);
    return null;
  }
}

// Test runner for direct execution
const isDirectRun = process.argv[1] && (process.argv[1].endsWith('hnb.js') || process.argv[1].endsWith('hnb'));
if (isDirectRun) {
  console.log('Testing HNB scraper standalone...');
  scrapeHnb().then(rates => {
    console.log('Result:', rates);
  });
}
