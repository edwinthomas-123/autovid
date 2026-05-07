const axios = require('axios');
const geminiKey = 'AIzaSyAwu2R0TyOC_t6vuEY-4xG4iPrEyAzdn88';

async function test() {
    const prompt = 'Return a JSON with a key "test" and value "ok"';
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generation_config: { response_mime_type: "application/json" }
            }
        );
        console.log('Success!');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.error('Error Status:', e.response?.status);
        console.error('Error Data:', JSON.stringify(e.response?.data, null, 2));
    }
}

test();
