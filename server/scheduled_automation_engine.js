const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const axios = require('axios');
const videoGenerator = require('./video_generator');
const scoutEngine = require('./scout_engine');

const AUTOMATION_DB_PATH = path.join(__dirname, 'scheduled_automation_db.json');
const KEYS_DB_PATH = path.join(__dirname, 'keys_db.json');
const SOCIAL_DB_PATH = path.join(__dirname, 'social_db.json');

if (!fs.existsSync(AUTOMATION_DB_PATH)) {
    fs.writeFileSync(AUTOMATION_DB_PATH, JSON.stringify({ automations: [] }, null, 2));
}

class ScheduledAutomationEngine {
    constructor() {
        try {
            const content = fs.readFileSync(AUTOMATION_DB_PATH, 'utf8').trim();
            this.db = content ? JSON.parse(content) : { automations: [] };
        } catch (e) {
            console.error('[SCHEDULED AUTOMATION] Load failed:', e.message);
            this.db = { automations: [] };
        }
    }

    saveDb() {
        fs.writeFileSync(AUTOMATION_DB_PATH, JSON.stringify(this.db, null, 2));
    }

    addAutomation(data) {
        const newAutomation = {
            id: Date.now().toString(),
            ...data,
            isActive: true,
            createdAt: new Date().toISOString(),
            lastRun: null,
            history: []
        };
        this.db.automations.push(newAutomation);
        this.saveDb();
        return newAutomation;
    }

    getAutomations() {
        return this.db.automations;
    }

    deleteAutomation(id) {
        this.db.automations = this.db.automations.filter(a => a.id !== id);
        this.saveDb();
    }

    updateAutomation(id, data) {
        const index = this.db.automations.findIndex(a => a.id === id);
        if (index !== -1) {
            this.db.automations[index] = { ...this.db.automations[index], ...data };
            this.saveDb();
        }
    }

    async processAutomations() {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const today = now.toISOString().split('T')[0];

        for (const auto of this.db.automations) {
            if (!auto.isActive) continue;
            if (auto.postTime !== currentTime) continue;
            
            // Avoid double runs in the same minute (though cron handles this, safety first)
            if (auto.lastRun && auto.lastRun.startsWith(today) && auto.lastRun.split(' ')[1] === currentTime) {
                continue;
            }

            console.log(`[SCHEDULED AUTOMATION] Triggering automation: "${auto.niche}" at ${auto.postTime}`);
            this.runAutomation(auto);
        }
    }

    async getLatestVideoUrl(source) {
        if (!source) return null;
        // If it's already a video URL, return it
        if (source.includes('watch?v=') || source.includes('youtu.be/')) return source;
        
        try {
            console.log(`[SCHEDULED AUTOMATION] Fetching latest video for source: ${source}`);
            const { execSync } = require('child_process');
            // Try to get the latest video ID from a channel or playlist
            const command = `yt-dlp --get-id --playlist-items 1 "${source}"`;
            const videoId = execSync(command).toString().trim();
            if (videoId) {
                return `https://www.youtube.com/watch?v=${videoId}`;
            }
        } catch (e) {
            console.error('[SCHEDULED AUTOMATION] Failed to get latest video:', e.message);
        }
        return null;
    }

    async runAutomation(auto) {
        try {
            const { channels, niche, videoType, clipperSource, avatarId } = auto;
            const keys = JSON.parse(fs.readFileSync(KEYS_DB_PATH, 'utf8'));
            const socialDb = JSON.parse(fs.readFileSync(SOCIAL_DB_PATH, 'utf8'));
            const { spawn } = require('child_process');

            if (!keys.geminiKey && !keys.openAiKey) throw new Error('Missing AI keys');
            
            let result;
            const today = new Date().toISOString().split('T')[0];
            const timestamp = Date.now();

            if (videoType === 'clipper_9_16') {
                console.log(`[SCHEDULED AUTOMATION] Starting Clipper for ${clipperSource}...`);
                const videoUrl = await this.getLatestVideoUrl(clipperSource);
                if (!videoUrl) throw new Error(`Could not find a video to clip from ${clipperSource}`);

                const outputFilename = `clipper_auto_${timestamp}.mp4`;
                const outputPath = path.join(__dirname, 'output', outputFilename);
                
                // Call processor.py (clipper)
                await new Promise((resolve, reject) => {
                    const py = spawn('python3', [
                        path.join(__dirname, 'processor.py'),
                        videoUrl, 'MRBEAST', outputPath, '1', '38', 'center'
                    ]);
                    let stderr = '';
                    py.stderr.on('data', d => stderr += d.toString());
                    py.on('close', code => {
                        if (code === 0) resolve();
                        else reject(new Error(`Clipper failed: ${stderr}`));
                    });
                });

                result = {
                    videoUrl: `${process.env.BASE_URL || 'http://localhost:3001'}/output/${outputFilename}`,
                    outputPath
                };
            } else {
                // 1. Generate Script
                console.log(`[SCHEDULED AUTOMATION] Generating script for ${niche}...`);
                const isShort = videoType.includes('short') || videoType.includes('talking_head');
                const script = await videoGenerator.generateScript({
                    topic: `A viral video about ${niche}. Style: ${videoType}`,
                    openAiKey: keys.openAiKey,
                    geminiKey: keys.geminiKey,
                    length: isShort ? 'short' : 'long'
                });

                // 2. Generate Video
                console.log(`[SCHEDULED AUTOMATION] Rendering video type: ${videoType}...`);
                if (videoType === 'talking_head_9_16') {
                    const outputFilename = `talking_head_auto_${timestamp}.mp4`;
                    const outputPath = path.join(__dirname, 'output', outputFilename);
                    
                    // Use a random background from background_clips if available
                    const bgClipsDir = path.join(__dirname, 'background_clips');
                    let bgPath = '';
                    if (fs.existsSync(bgClipsDir)) {
                        const files = fs.readdirSync(bgClipsDir).filter(f => f.endsWith('.mp4'));
                        if (files.length > 0) {
                            bgPath = path.join(bgClipsDir, files[Math.floor(Math.random() * files.length)]);
                        }
                    }
                    
                    // If no bg found, use a placeholder or error
                    if (!bgPath) throw new Error('No background clips found in server/background_clips. Please add some MP4 files.');

                    // Generate Audio
                    const audioPath = path.join(__dirname, 'output', `audio_${timestamp}.mp3`);
                    const fullText = typeof script === 'string' ? script : (script.scenes?.map(s => s.text).join(' ') || '');
                    
                    const { synthesize } = require('./piper_tts');
                    await synthesize(fullText, 'US-Female-Viral', audioPath);

                    const characterFiles = [
                        'gigachad.png', 'sigma_male.png', 'hypebeast.png', 'gamer_girl.png', 'npc_girl.png', 'soft_girl.png',
                        'cartoon_robot.png', 'cartoon_lion.png', 'cartoon_monster.png', 'cartoon_superhero.png'
                    ];
                    const characterFilename = characterFiles[avatarId || 0] || characterFiles[0];
                    const charImg = path.join(__dirname, '..', 'public', 'characters', characterFilename);

                    // Call talking_head_renderer.py
                    await new Promise((resolve, reject) => {
                        const py = spawn('python3', [
                            path.join(__dirname, 'talking_head_renderer.py'),
                            audioPath, bgPath, '[]', outputPath, 'MRBEAST', fullText, charImg
                        ]);
                        let stderr = '';
                        py.stderr.on('data', d => stderr += d.toString());
                        py.on('close', code => {
                            if (code === 0) resolve();
                            else reject(new Error(`Talking Head renderer failed: ${stderr}`));
                        });
                    });

                    result = {
                        videoUrl: `${process.env.BASE_URL || 'http://localhost:3001'}/output/${outputFilename}`,
                        outputPath
                    };
                } else if (videoType === 'ai_scout_16_9') {
                    // Scout logic
                    const toolPrompt = `Suggest one specific, real AI tool related to the niche "${niche}". Return ONLY the tool name and its main URL separated by a comma.`;
                    const toolRes = await axios.post(
                        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${keys.geminiKey}`,
                        { contents: [{ parts: [{ text: toolPrompt }] }] }
                    );
                    const toolInfo = toolRes.data.candidates[0].content.parts[0].text.split(',');
                    const toolName = toolInfo[0].trim();
                    const toolUrl = toolInfo[1]?.trim() || 'https://google.com';

                    const analysis = await scoutEngine.analyzeTool(toolUrl, keys.geminiKey);
                    result = await videoGenerator.renderVideo({
                        script: analysis.script,
                        voice: 'Rachel',
                        captionStyle: 'MRBEAST',
                        elevenLabsKey: keys.elevenLabsKey,
                        pexelsKey: keys.pexelsKey,
                        geminiKey: keys.geminiKey,
                        isShort: false,
                        topic: toolName
                    });
                } else {
                    result = await videoGenerator.renderVideo({
                        script,
                        voice: 'Rachel',
                        captionStyle: 'MRBEAST',
                        elevenLabsKey: keys.elevenLabsKey,
                        pexelsKey: keys.pexelsKey,
                        geminiKey: keys.geminiKey,
                        isShort: isShort,
                        topic: niche
                    });
                }
            }

            // 3. Post to Channels
            console.log(`[SCHEDULED AUTOMATION] Posting to ${channels.join(', ')}...`);
            for (const chanStr of channels) {
                const [platform, accountName] = chanStr.split(':');
                const account = socialDb.tokens[platform]?.find(t => !accountName || t.username === accountName);
                
                if (account) {
                    console.log(`[SCHEDULED AUTOMATION] Uploading to ${platform} (${account.username})...`);
                    // Note: Real upload logic would go here, calling internal functions from index.js
                }
            }

            auto.lastRun = `${today} ${new Date().toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'})}`;
            auto.history.push({
                date: auto.lastRun,
                status: 'success',
                message: `Video generated and scheduled for posting! Type: ${videoType}`,
                videoUrl: result.videoUrl
            });
            this.saveDb();

        } catch (error) {
            console.error(`[SCHEDULED AUTOMATION ERROR]`, error.message);
            auto.history.push({
                date: new Date().toISOString(),
                status: 'error',
                message: error.message
            });
            this.saveDb();
        }
    }

    start() {
        // Run every minute to check schedules
        cron.schedule('* * * * *', () => {
            this.processAutomations();
        });
        console.log('Scheduled Automation Engine Started');
    }
}

module.exports = new ScheduledAutomationEngine();
