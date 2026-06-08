import fs from 'fs';
import https from 'https';

const url = 'https://raw.githubusercontent.com/XThenuwara/FXRScout/master/public/data.json';
const outputPath = './public/data.json';

console.log('Fetching latest exchange rates database from upstream...');

https.get(url, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Failed to fetch database: Server returned status ${res.statusCode}`);
    process.exit(1);
  }

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      // Validate JSON formatting
      JSON.parse(data);
      fs.writeFileSync(outputPath, data, 'utf8');
      console.log('Successfully synced public/data.json with upstream FXRScout repository!');
    } catch (e) {
      console.error('Failed to parse fetched data as valid JSON. Upstream file might be corrupted.');
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error(`Network error during sync: ${err.message}`);
  process.exit(1);
});
