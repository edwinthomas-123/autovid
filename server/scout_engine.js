const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');

// Scout DB for tracking found tools
const SCOUT_DB_PATH = path.join(__dirname, 'scout_db.json');
if (!fs.existsSync(SCOUT_DB_PATH)) {
    fs.writeFileSync(SCOUT_DB_PATH, JSON.stringify({ tools: [], jobs: [] }, null, 2));
}

class ScoutEngine {
    constructor() {
        this.db = JSON.parse(fs.readFileSync(SCOUT_DB_PATH));
    }

    saveDb() {
        fs.writeFileSync(SCOUT_DB_PATH, JSON.stringify(this.db, null, 2));
    }

    async findNewTools() {
        // Mocking tool discovery from FutureTools for now
        // In a real scenario, we would scrape or use an API
        const tools = [
            { name: 'Krea AI', url: 'https://www.krea.ai', description: 'Real-time AI image generation and enhancement.' },
            { name: 'Sora', url: 'https://openai.com/sora', description: 'Text-to-video AI model.' },
            { name: 'Leonardo AI', url: 'https://leonardo.ai', description: 'Full-featured AI image generation platform.' }
        ];

        tools.forEach(tool => {
            if (!this.db.tools.find(t => t.url === tool.url)) {
                this.db.tools.push({ ...tool, discoveredAt: new Date().toISOString(), status: 'pending' });
            }
        });
        this.saveDb();
        return this.db.tools;
    }

    async analyzeTool(url, geminiKey) {
        console.log(`[SCOUT] Analyzing tool: ${url}`);
        
        // 1. Fetch page text
        let pageContent = '';
        try {
            const res = await axios.get(url, { 
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            pageContent = res.data.toString().substring(0, 10000); // Limit context
        } catch (e) {
            console.error(`[SCOUT] Failed to fetch ${url}: ${e.message}`);
            pageContent = `Tool URL: ${url}. (Fetch failed)`;
        }

        // 2. Use Gemini with rotation and fallback
        const MASTER_GEMINI_KEY = process.env.GEMINI_API_KEY || '';
        const finalGeminiKey = geminiKey || MASTER_GEMINI_KEY;
        const keys = [finalGeminiKey].filter(k => k && k !== 'undefined');

        const models = [
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-flash-latest",
            "gemini-pro-latest"
        ];

        const prompt = `
        You are an expert AI Content Scout. Analyze the following tool and write a viral 60-second video script.
        
        STORYTELLING GUIDELINES:
        - Hook: Start with a "Pattern Interrupt" (e.g., "Wait... stop scrolling," "I think I just found the future," "Everyone is sleeping on this tool").
        - Voice: Sound like a real person, not an AI. Use conversational fillers ("So," "Basically," "Look").
        - Emotion: Use "!" for excitement and "..." for pauses. Our TTS engine reads these!
        - Value: Quickly explain what the tool does and why it matters.

        Tool URL: ${url}
        Page Content Snapshot:
        ${pageContent}

        Return JSON format:
        {
            "toolName": "...",
            "script": "The full viral script with emotional punctuation...",
            "features": ["Feature 1", "Feature 2", "Feature 3"],
            "voiceover": "Just the narration text for the TTS engine."
        }
        `;

        let lastError = null;
        for (const key of keys) {
            for (const model of models) {
                try {
                    const response = await axios.post(
                        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
                        {
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: { responseMimeType: "application/json" }
                        },
                        { timeout: 15000 }
                    );

                    return JSON.parse(response.data.candidates[0].content.parts[0].text);
                } catch (e) {
                    lastError = e.response?.data || e.message;
                    console.warn(`[SCOUT] Gemini attempt failed (Model: ${model}, Key: ...${key.slice(-4)}):`, lastError.error?.message || lastError);
                    if (e.response?.status === 429) break; // Try next key if this one is exhausted
                    if (e.response?.status === 404) continue; // Try next model
                }
            }
        }

        throw new Error(`Gemini analysis failed after multiple attempts. Last error: ${JSON.stringify(lastError)}`);
    }

    async createJob(toolUrl, config) {
        const job = {
            id: Date.now().toString(),
            url: toolUrl,
            status: 'queued',
            config,
            createdAt: new Date().toISOString()
        };
        this.db.jobs.push(job);
        this.saveDb();
        return job;
    }
}

module.exports = new ScoutEngine();
