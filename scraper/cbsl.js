import axios from 'axios';
import * as cheerio from 'cheerio';
import { BROWSER_HEADERS, detectCurrencyKey } from './common.js';

/**
 * Central Bank of Sri Lanka (CBSL) Exchange Rates Scraper
 * Crawls official Telegraphic Transfer (TT) buying and selling rates.
 */
export async function scrapeCbsl() {
  try {
    const url = 'https://www.cbsl.gov.lk/en/rates-and-indicators/exchange-rates';
    const { data: html } = await axios.get(url, {
      headers: BROWSER_HEADERS,
      timeout: 12000
    });

    const $ = cheerio.load(html);
    const rates = {};

    // Loop through every table row on the page to parse currency codes and their corresponding rates
    $('table tr').each((_, tr) => {
      const cells = [];
      $(tr).find('td, th').each((_, td) => {
        cells.push($(td).text().trim());
      });

      if (cells.length < 2) return;

      // Find if any cell matches a valid currency key
      let currencyCode = null;
      let codeIndex = -1;

      for (let i = 0; i < cells.length; i++) {
        const detected = detectCurrencyKey(cells[i]);
        if (detected) {
          currencyCode = detected;
          codeIndex = i;
          break;
        }
      }

      if (!currencyCode) return;

      // Find numeric rates in subsequent cells
      const numbers = [];
      for (let i = codeIndex + 1; i < cells.length; i++) {
        const val = parseFloat(cells[i].replace(/,/g, ''));
        if (!isNaN(val) && val > 0) {
          numbers.push(val);
        }
      }

      // If we found numbers, map them to buy and sell rates
      if (numbers.length >= 2) {
        rates[currencyCode] = {
          buy: numbers[0],
          sell: numbers[1]
        };
      } else if (numbers.length === 1) {
        // Fallback for single rate tables (indicative)
        rates[currencyCode] = {
          buy: numbers[0],
          sell: numbers[0]
        };
      }
    });

    // Verify core USD rate is captured successfully as an integrity check
    if (!rates.USD || rates.USD.buy === 0) {
      throw new Error('Failed to parse USD rate from CBSL exchange rate elements.');
    }

    console.log('Successfully scraped CBSL rates:', Object.keys(rates));
    return rates;
  } catch (err) {
    console.error('Error in scrapeCbsl:', err.message);
    return null;
  }
}
