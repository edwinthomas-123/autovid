const https = require('https');

const geminiKey = 'AIzaSyAwu2R0TyOC_t6vuEY-4xG4iPrEyAzdn88';
const model = 'gemini-1.5-flash';

const payload = JSON.stringify({
  contents: [{
    parts: [{
      text: 'say hello'
    }]
  }]
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1/models/${model}:generateContent?key=${geminiKey}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', body);
  });
});

req.on('error', e => console.error(e));
req.write(payload);
req.end();
