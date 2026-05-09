const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function recordToolDemo(url, outputPath, durationSeconds = 15) {
    console.log(`[RECORDER] Starting recording for ${url}...`);
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        deviceScaleFactor: 1,
        recordVideo: {
            dir: path.dirname(outputPath),
            size: { width: 1280, height: 720 }
        }
    });

    // Add extra headers to seem more human
    await context.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
    });

    const page = await context.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        
        // Handle common "Accept Cookies" buttons if they appear
        const cookieButtons = ['Accept', 'Allow all', 'I agree', 'Got it'];
        for (const text of cookieButtons) {
            const btn = page.getByRole('button', { name: text, exact: false });
            if (await btn.isVisible()) {
                await btn.click();
                break;
            }
        }

        // Perform some "Auto-Pilot" actions
        // 1. Scroll down slowly
        await page.evaluate(async () => {
            for (let i = 0; i < 3; i++) {
                window.scrollBy(0, 500);
                await new Promise(r => setTimeout(r, 1000));
            }
        });

        // 2. Look for interactive elements and hover/click
        const buttons = await page.$$('button, a.btn, .button');
        if (buttons.length > 0) {
            console.log(`[RECORDER] Interacting with buttons...`);
            for (let i = 0; i < Math.min(buttons.length, 2); i++) {
                try {
                    await buttons[i].hover();
                    await new Promise(r => setTimeout(r, 500));
                } catch (e) {}
            }
        }

        // 3. Move mouse randomly to simulate activity
        for (let i = 0; i < 5; i++) {
            await page.mouse.move(Math.random() * 1280, Math.random() * 720);
            await new Promise(r => setTimeout(r, 200));
        }

        // 4. Wait for a bit to capture more
        await page.waitForTimeout((durationSeconds - 8) * 1000);

    } catch (e) {
        console.error(`[RECORDER] Recording error: ${e.message}`);
    } finally {
        await context.close();
        const videoFile = await page.video().path();
        
        // Rename the temporary video file to our desired outputPath
        if (fs.existsSync(videoFile)) {
            fs.renameSync(videoFile, outputPath);
            console.log(`[RECORDER] Video saved to ${outputPath}`);
        }
        
        await browser.close();
    }
}

module.exports = { recordToolDemo };
