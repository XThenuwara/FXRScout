import axios from 'axios';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json'
};

async function testSampathExchange() {
  const url = 'https://www.sampath.lk/api/exchange-rates';
  try {
    const res = await axios.get(url, { headers, timeout: 10000 });
    console.log('Status:', res.status);
    console.log('Data:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testSampathExchange();




