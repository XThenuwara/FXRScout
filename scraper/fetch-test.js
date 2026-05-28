import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRATCH_DIR = '/Users/YasasT/.gemini/antigravity-ide/brain/f29c48e7-1f5c-4d02-90bc-984db4e0a57b/scratch';

if (!fs.existsSync(SCRATCH_DIR)) {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

const banks = [
  { key: 'sampath', url: 'https://www.sampath.lk/rates-and-charges?activeTab=exchange-rates' },
  { key: 'hnb', url: 'https://www.hnb.lk/exchange-rates' },
  { key: 'peoples', url: 'https://www.peoplesbank.lk/exchange-rates/' },
  { key: 'seylan', url: 'https://www.seylan.lk/exchange-rates' },
  { key: 'union', url: 'https://www.unionb.com/exchange-rates/' },
  { key: 'amana', url: 'https://www.amanabank.lk/business/treasury/exchange-rates.html' },
  { key: 'dfcc', url: 'https://www.dfcc.lk/rates-and-tariff/exchange-rates' },
  { key: 'nsb', url: 'https://www.nsb.lk/rates-tarriffs/nsb-exchange-rates/' },
  { key: 'pabc', url: 'https://www.pabcbank.com/treasury/exchange-rate/' },
  { key: 'ndb', url: 'https://www.ndbbank.com/rates/exchange-rates' }
];

async function run() {
  console.log('Starting fetch tests...');
  for (const bank of banks) {
    try {
      console.log(`Fetching ${bank.key}...`);
      const res = await axios.get(bank.url, {
        headers: BROWSER_HEADERS,
        timeout: 10000,
        validateStatus: false
      });
      console.log(`  Status: ${res.status}, Content-Length: ${res.data ? res.data.length : 0}`);
      const filePath = path.join(SCRATCH_DIR, `${bank.key}.html`);
      fs.writeFileSync(filePath, res.data || '', 'utf-8');
      console.log(`  Saved to ${filePath}`);
    } catch (err) {
      console.error(`  Error fetching ${bank.key}: ${err.message}`);
    }
  }
}

run();
