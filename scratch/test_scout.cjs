const scoutEngine = require('../server/scout_engine');
const fs = require('fs');
const path = require('path');

const keys = JSON.parse(fs.readFileSync('./server/keys_db.json', 'utf8'));

async function test() {
    try {
        console.log('Testing Scout Engine...');
        const result = await scoutEngine.analyzeTool('https://www.krea.ai', keys.geminiKey);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Test failed:', e.response?.data || e.message);
    }
}

test();
