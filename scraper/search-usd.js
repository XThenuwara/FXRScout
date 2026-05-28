import fs from 'fs';

const path = '/Users/YasasT/.gemini/antigravity-ide/scratch/sampath-nuxt-state.json';
if (!fs.existsSync(path)) {
  console.error('File not found:', path);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(path, 'utf-8'));

const matches = [];

function search(obj, currentPath = 'state') {
  if (!obj) return;
  if (typeof obj === 'string') {
    if (obj.toLowerCase().includes('usd') || obj.toLowerCase().includes('united states dollar') || obj.toLowerCase().includes('us dollar')) {
      matches.push({ path: currentPath, val: obj });
    }
  } else if (typeof obj === 'number') {
    // If the number is between 280 and 360, it could be a LKR exchange rate
    if (obj >= 280 && obj <= 360) {
      matches.push({ path: currentPath, val: obj });
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => search(item, `${currentPath}[${index}]`));
  } else if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      search(obj[key], `${currentPath}.${key}`);
    }
  }
}

search(data);

console.log(`Found ${matches.length} matches:`);
matches.slice(0, 100).forEach(m => {
  console.log(`- ${m.path}: ${m.val}`);
});
