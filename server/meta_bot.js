const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SESSION_FILE = path.join(__dirname, 'meta_session.json');
const OUTPUT_DIR = path.join(__dirname, 'output');

async function generateVideo(prompt, browserInstance = null) {
    if (!fs.existsSync(SESSION_FILE)) {
        throw new Error('Meta AI Session not found. Please run "node server/auth_helper.js" first.');
    }

    console.log(`[META BOT] Starting generation for: "${prompt}"`);

    const browser = browserInstance || await chromium.launch({ 
        headless: true, 
        args: ['--disable-blink-features=AutomationControlled'] 
    });
    
    const context = browserInstance ? browser.contexts()[0] : await browser.newContext({
        storageState: SESSION_FILE,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = browserInstance ? (await context.pages())[0] : await context.newPage();

    try {
        if (!browserInstance) {
            await page.goto('https://www.meta.ai/', { waitUntil: 'networkidle' });
        } else {
            // If reusing, go back to chat or clear input
            await page.goto('https://www.meta.ai/', { waitUntil: 'networkidle' });
        }

        const inputExists = await page.isVisible('textarea[placeholder*="Ask"]');
        if (!inputExists) {
            throw new Error('Not logged in to Meta AI. Please run "node server/auth_helper.js" again.');
        }

        const fullPrompt = `Create a high-quality cinematic video: ${prompt}`;
        await page.fill('textarea[placeholder*="Ask"]', fullPrompt);
        await page.keyboard.press('Enter');

        console.log('[META BOT] Prompt submitted. Waiting for generation...');

        let downloadPromise = page.waitForEvent('download', { timeout: 300000 });
        const downloadBtn = page.locator('button:has-text("Download"), [aria-label*="Download"], [data-testid*="download"]');
        
        await downloadBtn.first().waitFor({ state: 'visible', timeout: 300000 });
        console.log('[META BOT] Download button found. Clicking...');
        
        await downloadBtn.first().click();
        const download = await downloadPromise;

        const timestamp = Date.now();
        const filename = `meta_vid_${timestamp}.mp4`;
        const outputPath = path.join(OUTPUT_DIR, filename);
        
        await download.saveAs(outputPath);
        console.log(`[META BOT] Video saved successfully: ${outputPath}`);

        if (!browserInstance) await browser.close();
        return {
            success: true,
            videoUrl: `/output/${filename}`,
            outputPath,
            filename
        };

    } catch (error) {
        console.error('[META BOT ERROR]', error.message);
        if (!browserInstance) await browser.close();
        throw error;
    }
}

async function startBulkSession() {
    const browser = await chromium.launch({ 
        headless: true, 
        args: ['--disable-blink-features=AutomationControlled'] 
    });
    const context = await browser.newContext({
        storageState: SESSION_FILE,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    await context.newPage();
    return browser;
}

module.exports = { generateVideo, startBulkSession };
