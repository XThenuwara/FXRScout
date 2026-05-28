import { 
  readDatabase, 
  writeDatabase, 
  getLiveGoogleRate,
  getFallbackBankRates
} from './scraper/common.js';
import { scrapeComBank } from './scraper/com-bank.js';
import { scrapeSampath } from './scraper/sampath.js';
import { scrapeHnb } from './scraper/hnb.js';
import { scrapeSeylan } from './scraper/seylan.js';
import { scrapeDfcc } from './scraper/dfcc.js';
import { scrapeNsb } from './scraper/nsb.js';
import { scrapeNdb } from './scraper/ndb.js';
import { scrapePeoples } from './scraper/peoples.js';
import { scrapeAmana } from './scraper/amana.js';
import { scrapeCbsl } from './scraper/cbsl.js';

/**
 * Main Centralized Scraper Orchestrator
 * Fetches the Google reference rate once, executes all bank scrapers,
 * resolves companion/fallback simulations, and commits to data.json in one atomic cycle.
 */
async function runOrchestrator() {
  try {
    console.log('=== FXRScout Centralized Scraper Orchestrator ===');
    
    // 1. Read existing flat-file database
    const database = readDatabase();
    
    // 2. Resolve calendar dates (safe against timezone shifts)
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA'); // YYYY-MM-DD
    
    const lastEntry = database.length > 0 ? database[database.length - 1] : null;
    const lastEntryDateStr = lastEntry ? new Date(lastEntry.timestamp).toLocaleDateString('en-CA') : '';
    
    const isSameDay = lastEntryDateStr === todayStr;
    
    // 3. Fetch live Interbank reference (Google Rate) ONCE per run
    const googleRate = await getLiveGoogleRate(lastEntry);
    
    // Helper to get previous recorded rate for a bank
    const getPreviousRate = (bankKey) => {
      return isSameDay ? (database.length > 1 ? database[database.length - 2]?.[bankKey] : null) : lastEntry?.[bankKey];
    };

    // 4. Resolve all 17 currencies for a single bank, applying simulated fallbacks
    const resolveBankRates = async (bankKey, scrapeFn, isWaf = false) => {
      let scraped = isWaf ? null : await scrapeFn();
      const result = {};
      const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CHF', 'KWD', 'OMR', 'SAR', 'AED', 'QAR', 'JOD', 'BHD', 'INR', 'CAD', 'NZD'];
      
      currencies.forEach(cur => {
        const prev = getPreviousRate(bankKey);
        const interbank = googleRate[cur];
        
        if (scraped && scraped[cur]) {
          result[cur] = scraped[cur];
        } else {
          if (!isWaf) {
            console.warn(`${bankKey} scraping failed or currency ${cur} missing, resolving with last known actual rates fallback.`);
          }
          result[cur] = getFallbackBankRates(bankKey, prev, interbank, cur);
        }
      });
      
      return result;
    };

    // --- Run Bank Scrapers & Fallbacks ---
    console.log('Launching parallel ingestion across all banks concurrently...');
    const [
      cbslRates,
      combankRates,
      sampathRates,
      hnbRates,
      peoplesRates,
      seylanRates,
      unionRates,
      amanaRates,
      dfccRates,
      nsbRates,
      pabcRates,
      ndbRates
    ] = await Promise.all([
      resolveBankRates('cbsl', scrapeCbsl),
      resolveBankRates('combank', scrapeComBank),
      resolveBankRates('sampath', scrapeSampath),
      resolveBankRates('hnb', scrapeHnb),
      resolveBankRates('peoples', scrapePeoples),
      resolveBankRates('seylan', scrapeSeylan),
      resolveBankRates('union', null, true),
      resolveBankRates('amana', scrapeAmana),
      resolveBankRates('dfcc', scrapeDfcc),
      resolveBankRates('nsb', scrapeNsb),
      resolveBankRates('pabc', null, true),
      resolveBankRates('ndb', scrapeNdb)
    ]);
    
    // 5. Update or append today's database entry
    if (isSameDay) {
      console.log(`Updating existing database entry for today: ${todayStr}`);
      
      lastEntry.timestamp = today.toISOString();
      lastEntry.google = googleRate;
      lastEntry.cbsl = cbslRates;
      lastEntry.combank = combankRates;
      lastEntry.sampath = sampathRates;
      lastEntry.hnb = hnbRates;
      lastEntry.peoples = peoplesRates;
      lastEntry.seylan = seylanRates;
      lastEntry.union = unionRates;
      lastEntry.amana = amanaRates;
      lastEntry.dfcc = dfccRates;
      lastEntry.nsb = nsbRates;
      lastEntry.pabc = pabcRates;
      lastEntry.ndb = ndbRates;
    } else {
      console.log(`Creating new daily rates entry in database: ${todayStr}`);
      
      const newEntry = {
        timestamp: today.toISOString(),
        google: googleRate,
        cbsl: cbslRates,
        combank: combankRates,
        sampath: sampathRates,
        hnb: hnbRates,
        peoples: peoplesRates,
        seylan: seylanRates,
        union: unionRates,
        amana: amanaRates,
        dfcc: dfccRates,
        nsb: nsbRates,
        pabc: pabcRates,
        ndb: ndbRates
      };
      
      database.push(newEntry);
    }
    
    // 6. Write to flat-file database
    writeDatabase(database);
    console.log('=== FXRScout Ingestion Cycle Completed Successfully ===');
    
  } catch (error) {
    console.error('CRITICAL: Centralized scraper orchestrator execution failed!', error);
    process.exit(1);
  }
}

// Execute orchestrator
runOrchestrator();

