import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

// Resolve directory name in ES Module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.join(__dirname, '..');
export const DATA_DIR = path.join(PROJECT_ROOT, 'public');
export const DATA_PATH = path.join(DATA_DIR, 'data.json');

/**
 * Standard HTTP headers to look like a real browser
 */
export const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

/**
 * Dynamic string pattern matcher that detects standardized currency keys out of various row descriptions.
 * Supports a full catalog of 17 foreign currencies.
 */
export function detectCurrencyKey(text) {
  if (!text) return null;
  
  // First, check if a standard 3-letter currency code is present as a distinct word in uppercase
  const rawUpper = text.toUpperCase();
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CHF', 'KWD', 'OMR', 'SAR', 'AED', 'QAR', 'JOD', 'BHD', 'INR', 'CAD', 'NZD'];
  
  for (const code of currencies) {
    const regex = new RegExp(`\\b${code}\\b`);
    if (regex.test(rawUpper)) {
      return code;
    }
  }

  const t = rawUpper.replace(/[^A-Z\s]/g, '').trim();
  
  if (t === 'US DOLLARS' || t === 'US DOLLAR' || t === 'USD' || t.includes('UNITED STATES DOLLAR')) return 'USD';
  if (t === 'EURO' || t === 'EUR' || t.includes('EURO')) return 'EUR';
  if (t.includes('STERLING') || t.includes('POUND') || t === 'GBP' || t.includes('GREAT BRITAIN')) return 'GBP';
  if (t === 'JAPANESE YEN' || t === 'JPY' || t.includes('JAPANESE YEN')) return 'JPY';
  if (t === 'SINGAPORE DOLLARS' || t === 'SINGAPORE DOLLAR' || t === 'SGD' || t.includes('SINGAPORE')) return 'SGD';
  if (t === 'AUSTRALIAN DOLLARS' || t === 'AUSTRALIAN DOLLAR' || t === 'AUD' || t.includes('AUSTRALIAN')) return 'AUD';
  if (t === 'SWISS FRANCS' || t === 'SWISS FRANC' || t === 'CHF' || t.includes('SWISS')) return 'CHF';
  if (t === 'KUWAITI DINARS' || t === 'KUWAITI DINAR' || t === 'KWD' || t.includes('KUWAITI')) return 'KWD';
  if (t === 'OMANI RIYALS' || t === 'OMANI RIYAL' || t === 'OMR' || t.includes('OMANI')) return 'OMR';
  if (t.includes('SAUDI ARABIAN') || t === 'SAUDI RIYAL' || t === 'SAR' || t.includes('SAUDI')) return 'SAR';
  if (t.includes('UAE DIRHAM') || t.includes('UNITED ARAB EMIRATES') || t === 'AED' || t === 'UAE DIRHAMS' || t.includes('DIRHAM')) return 'AED';
  if (t === 'QATAR RIYALS' || t === 'QATAR RIYAL' || t.includes('QATARI') || t === 'QAR' || t.includes('QATAR')) return 'QAR';
  if (t === 'JORDANIAN DINARS' || t === 'JORDANIAN DINAR' || t === 'JOD' || t.includes('JORDANIAN')) return 'JOD';
  if (t === 'BAHRAIN DINARS' || t === 'BAHRAIN DINAR' || t.includes('BAHRAINI') || t === 'BHD' || t.includes('BAHRAIN')) return 'BHD';
  if (t === 'INDIAN RUPEES' || t === 'INDIAN RUPEE' || t === 'INR' || t.includes('INDIAN')) return 'INR';
  if (t === 'CANADIAN DOLLAR' || t === 'CANADIAN DOLLARS' || t === 'CAD' || t.includes('CANADIAN')) return 'CAD';
  if (t === 'NEW ZEALAND DOLLARS' || t === 'NEW ZEALAND DOLLAR' || t === 'NZD' || t.includes('NEW ZEALAND')) return 'NZD';
  
  return null;
}

/**
 * Fetches HTML from a target URL with robust browser-like configuration
 * @param {string} url 
 * @returns {Promise<string>} HTML body
 */
export async function fetchHTML(url) {
  try {
    const response = await axios.get(url, {
      headers: BROWSER_HEADERS,
      timeout: 15000
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch HTML from ${url}: ${error.message}`);
  }
}

/**
 * Reads the flat-file database (data.json)
 * @returns {Array} List of daily rates entries
 */
export function readDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DATA_PATH)) {
      return [];
    }

    const fileContent = fs.readFileSync(DATA_PATH, 'utf-8');
    const database = JSON.parse(fileContent);
    
    return Array.isArray(database) ? database : [];
  } catch (error) {
    console.error('Warning: Failed to read/parse database, returning empty list.', error.message);
    return [];
  }
}

/**
 * Writes data back to the flat-file database (data.json) with pretty-printing
 * @param {Array} database 
 */
export function writeDatabase(database) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Cap database to latest 365 entries
    const MAX_HISTORY_DAYS = 365;
    let finalDatabase = database;
    if (database.length > MAX_HISTORY_DAYS) {
      console.log(`Capping historical records to the latest ${MAX_HISTORY_DAYS} entries.`);
      finalDatabase = database.slice(database.length - MAX_HISTORY_DAYS);
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(finalDatabase, null, 2), 'utf-8');
    console.log(`Successfully updated database flat-file at: ${DATA_PATH}`);
  } catch (error) {
    console.error('CRITICAL: Failed to write to flat-file database!', error);
    throw error;
  }
}

/**
 * Fetches live Google Interbank reference rate from open.er-api.com
 * Falls back to a realistic random walk based on previous data if API fails.
 * @param {Object|null} lastEntry 
 * @returns {Promise<number>} Live USD/LKR rate
 */
export async function getLiveGoogleRate(lastEntry = null) {
  const result = {
    USD: 324.70,
    EUR: 377.71,
    GBP: 436.86,
    JPY: 2.02,
    SGD: 248.99,
    AUD: 228.09,
    CHF: 406.11,
    KWD: 1056.00,
    OMR: 843.00,
    SAR: 86.58,
    AED: 88.41,
    QAR: 89.20,
    JOD: 457.00,
    BHD: 861.00,
    INR: 3.89,
    CAD: 238.10,
    NZD: 198.80
  };

  try {
    console.log('Fetching live interbank reference rates...');
    const response = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 8000 });
    if (response.data && response.data.rates && response.data.rates.LKR) {
      const usdLkr = parseFloat(response.data.rates.LKR);
      if (!isNaN(usdLkr) && usdLkr > 200 && usdLkr < 400) {
        result.USD = Math.round(usdLkr * 100) / 100;
        
        const keys = ['EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CHF', 'KWD', 'OMR', 'SAR', 'AED', 'QAR', 'JOD', 'BHD', 'INR', 'CAD', 'NZD'];
        keys.forEach(k => {
          const usdRate = parseFloat(response.data.rates[k]);
          if (!isNaN(usdRate) && usdRate > 0) {
            result[k] = Math.round((usdLkr / usdRate) * 100) / 100;
          }
        });
        
        console.log(`Fetched real-time Interbank reference rates for 17 currencies successfully.`);
        return result;
      }
    }
  } catch (err) {
    console.warn('Could not fetch live interbank API, using fallback estimation.', err.message);
  }

  // Fallback random walk for all 17 currencies
  const fallbackVal = (currencyKey, baseVal) => {
    let prevVal = null;
    if (lastEntry && lastEntry.google) {
      if (typeof lastEntry.google.rate === 'number' && currencyKey === 'USD') {
        prevVal = lastEntry.google.rate;
      } else if (lastEntry.google[currencyKey]) {
        prevVal = lastEntry.google[currencyKey];
      }
    }
    if (prevVal) {
      const change = (Math.random() - 0.5) * 2 * (baseVal * 0.003); // +/- 0.3% max daily change
      const walk = Math.max(baseVal * 0.85, Math.min(baseVal * 1.15, prevVal + change));
      return Math.round(walk * 100) / 100;
    }
    return baseVal;
  };

  Object.keys(result).forEach(cur => {
    result[cur] = fallbackVal(cur, result[cur]);
  });

  return result;
}

/**
 * Return previous actual bank rates as a fallback when scraping fails, avoiding simulated/random rates.
 */
export function getFallbackBankRates(bankKey, lastBankEntry, googleRateVal, currency = 'USD') {
  if (lastBankEntry) {
    if (typeof lastBankEntry.buy === 'number' && currency === 'USD') {
      return { buy: lastBankEntry.buy, sell: lastBankEntry.sell };
    } else if (lastBankEntry[currency]) {
      return { buy: lastBankEntry[currency].buy, sell: lastBankEntry[currency].sell };
    }
  }
  
  // Safe static backup: Google interbank rate with a standard interbank margin of 1.0%
  const buy = Math.round((googleRateVal * 0.99) * 100) / 100;
  const sell = Math.round((googleRateVal * 1.01) * 100) / 100;
  return { buy, sell };
}

