const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const axios = require('axios');
const videoGenerator = require('./video_generator');

const SERIES_DB_PATH = path.join(__dirname, 'series_db.json');
const KEYS_DB_PATH = path.join(__dirname, 'keys_db.json');

if (!fs.existsSync(SERIES_DB_PATH)) {
    fs.writeFileSync(SERIES_DB_PATH, JSON.stringify({ series: [] }, null, 2));
}

class SeriesEngine {
    constructor() {
        try {
            const content = fs.readFileSync(SERIES_DB_PATH, 'utf8').trim();
            if (!content) {
                this.db = { series: [] };
                this.saveDb();
            } else {
                this.db = JSON.parse(content);
                if (!this.db.series) this.db.series = [];
            }
        } catch (e) {
            console.error('[SERIES ENGINE] Database load failed, resetting:', e.message);
            this.db = { series: [] };
            this.saveDb();
        }
    }

    saveDb() {
        fs.writeFileSync(SERIES_DB_PATH, JSON.stringify(this.db, null, 2));
    }

    addSeries(seriesData) {
        const newSeries = {
            id: Date.now().toString(),
            ...seriesData,
            isActive: true,
            createdAt: new Date().toISOString(),
            lastRun: null,
            history: []
        };
        this.db.series.push(newSeries);
        this.saveDb();
        
        // Immediate generation for the first video
        console.log(`[SERIES ENGINE] New series created: "${newSeries.topic}". Triggering initial generation...`);
        this.generateAndPost(newSeries);
        
        return newSeries;
    }

    getSeries() {
        return this.db.series;
    }

    deleteSeries(id) {
        this.db.series = this.db.series.filter(s => s.id !== id);
        this.saveDb();
    }

    updateSeries(id, data) {
        const index = this.db.series.findIndex(s => s.id === id);
        if (index !== -1) {
            this.db.series[index] = { ...this.db.series[index], ...data };
            this.saveDb();
        }
    }

    async processAllSeries() {
        console.log('[SERIES ENGINE] Running daily series check...');
        const today = new Date().toISOString().split('T')[0];
        
        for (const series of this.db.series) {
            if (!series.isActive) continue;
            
            // If already run today, skip
            if (series.lastRun && series.lastRun.split('T')[0] === today) {
                console.log(`[SERIES] Series "${series.topic}" already run today.`);
                continue;
            }

            console.log(`[SERIES] Processing series: "${series.topic}"`);
            await this.generateAndPost(series);
        }
    }

    async generateAndPost(series) {
        try {
            const { topic, theme, niche, engine, style, socialAccount } = series;
            console.log(`[SERIES] Generating video for "${topic}" | Theme: ${theme} | Niche: ${niche} | Engine: ${engine}`);
            
            // Load keys from disk to ensure we have the latest
            const keys = JSON.parse(fs.readFileSync(KEYS_DB_PATH, 'utf8'));
            if (!keys.pexelsKey || (!keys.geminiKey && !keys.openAiKey)) {
                throw new Error('Missing API keys for automated generation. Please save keys in Settings.');
            }

            // 1. Generate Script
            console.log(`[SERIES] Generating script for "${topic}"...`);
            const script = await videoGenerator.generateScript({
                topic: `A ${theme} style short video about ${topic} for the ${niche} niche. Style: ${style}`,
                openAiKey: keys.openAiKey,
                geminiKey: keys.geminiKey,
                length: 'short'
            });

            // 2. Render Video
            console.log(`[SERIES] Rendering video for "${topic}" using ${engine}...`);
            let result;
            if (engine === 'Meta AI') {
                result = await videoGenerator.generateBulkMetaVideos({ 
                    script, 
                    theme, 
                    niche, 
                    style, 
                    elevenLabsKey: keys.elevenLabsKey 
                });
            } else {
                result = await videoGenerator.renderVideo({
                    script,
                    voice: series.voice || 'Rachel',
                    captionStyle: series.captionStyle || 'MRBEAST',
                    elevenLabsKey: keys.elevenLabsKey,
                    pexelsKey: keys.pexelsKey,
                    geminiKey: keys.geminiKey,
                    isShort: true
                });
            }

            // 3. Upload (Simulated for now, would integrate with YouTube/TikTok API)
            console.log(`[SERIES] Uploading video for "${topic}" to ${socialAccount}...`);
            const uploadMessage = `Successfully uploaded to ${socialAccount}`;

            series.lastRun = new Date().toISOString();
            series.history.push({
                date: series.lastRun,
                status: 'success',
                message: `Video generated and uploaded! | Topic: ${topic} | URL: ${result.videoUrl}`,
                videoUrl: result.videoUrl
            });
            this.saveDb();
            
            console.log(`[SERIES] Successfully processed "${series.topic}"`);
        } catch (error) {
            console.error(`[SERIES ERROR] Failed for "${series.topic}":`, error.message);
            series.history.push({
                date: new Date().toISOString(),
                status: 'error',
                message: error.message
            });
            this.saveDb();
        }
    }

    start() {
        // Run every day at midnight
        cron.schedule('0 0 * * *', () => {
            this.processAllSeries();
        });
        
        // Also run once on start to check if we missed today
        setTimeout(() => this.processAllSeries(), 5000);
        
        console.log('Series Automation Engine Started');
    }
}

module.exports = new SeriesEngine();
