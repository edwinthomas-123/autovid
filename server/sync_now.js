const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const automationEngine = require('./automation_engine');

async function sync() {
    console.log('🚀 Starting Manual Sync...');
    try {
        const count = await automationEngine.syncBackgroundClips();
        console.log(`✅ Success! Found and synced ${count} videos.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Sync Failed:', err.message);
        if (err.message.includes('token')) {
            console.log('\n👉 ACTION REQUIRED: Please log in on the website first (http://localhost:5174/drive-automator) to generate your access token.');
        }
        process.exit(1);
    }
}

sync();
