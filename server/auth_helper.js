const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SESSION_FILE = path.join(__dirname, 'meta_session.json');

async function captureMetaLogin() {
    console.log('--- META AI AUTH HELPER ---');
    console.log('1. A browser will open.');
    console.log('2. Please log in to your Meta account manually.');
    console.log('3. Once you are logged in and see the chat interface, come back here.');
    console.log('4. The script will save your session automatically.');
    console.log('---------------------------');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://www.meta.ai/');

    console.log('Waiting for login... (Close the browser window when done or wait for automatic capture)');

    // Polling to see if we are logged in (looking for common post-login elements)
    const checkLogin = setInterval(async () => {
        try {
            // Meta AI usually has a user profile or a specific chat input after login
            const isLoggedIn = await page.isVisible('textarea[placeholder*="Ask"]');
            if (isLoggedIn) {
                console.log('Login detected! Saving session...');
                await context.storageState({ path: SESSION_FILE });
                console.log(`Session saved to ${SESSION_FILE}`);
                clearInterval(checkLogin);
                await browser.close();
                process.exit(0);
            }
        } catch (e) {}
    }, 2000);

    // Keep alive for 5 minutes
    setTimeout(async () => {
        console.log('Timeout reached. Closing...');
        await browser.close();
        process.exit(0);
    }, 300000);
}

captureMetaLogin();
