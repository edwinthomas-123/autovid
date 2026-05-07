const axios = require('axios');

const geminiKey = 'AIzaSyAwu2R0TyOC_t6vuEY-4xG4iPrEyAzdn88';
const prompt = 'A futuristic city in 2030, cinematic lighting, highly detailed';

const payload = {
  instances: [{ prompt }],
  parameters: { sampleCount: 1 }
};

async function testImagen() {
  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${geminiKey}`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log('Status:', res.status);
    console.log('Result:', JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error('Error:', e.response?.status, e.response?.data || e.message);
  }
}

testImagen();
