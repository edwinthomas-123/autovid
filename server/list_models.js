const https = require('https');

const geminiKey = 'AIzaSyAwu2R0TyOC_t6vuEY-4xG4iPrEyAzdn88';

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1/models?key=${geminiKey}`,
  method: 'GET'
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
req.end();
