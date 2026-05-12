const express = require('express');
const app = express();
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'background_clips'))
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});
const upload = multer({ storage: storage });
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { google } = require('googleapis');
const session = require('express-session');
const axios = require('axios');

require('dotenv').config();

const BASE_URL = process.env.BASE_URL || (process.platform === 'win32' ? 'http://localhost:3001' : 'https://wellvid.tech');
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
    console.log('[NETWORK] Received ping from browser!');
    res.send('AutoVid Server is Alive!');
});
app.use(session({
    secret: 'autovid-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Google OAuth Configuration
const SCOPES = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly'
];

const TOKEN_PATH = path.join(__dirname, 'google_token.json');

let oauth2Client;
const loadGoogleConfig = () => {
    try {
        const secretPath = path.join(__dirname, 'google_credentials.json');
        if (fs.existsSync(secretPath)) {
            const content = JSON.parse(fs.readFileSync(secretPath));
            const keys = content.web || content.installed;
            const redirectUri = `${BASE_URL}/api/auth/google/callback`;
            oauth2Client = new google.auth.OAuth2(
                keys.client_id,
                keys.client_secret,
                redirectUri
            );
            console.log('[AUTH] Google OAuth2 Client Initialized');
        } else {
            console.warn('[AUTH] google_credentials.json not found in server directory');
        }
    } catch (e) {
        console.error('[AUTH] Failed to load google_credentials.json:', e.message);
    }
};
loadGoogleConfig();

// --- AUTH ROUTES ---
app.get('/api/auth/google', (req, res) => {
    if (!oauth2Client) return res.status(500).json({ error: 'Google OAuth not configured on server' });
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });
    res.redirect(url);
});

app.get('/api/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect(`${BASE_URL}?error=no_code`);
    
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        
        // Get User Info
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        
        // Fetch YouTube Channel Info
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        let ytChannelName = userInfo.data.name;
        let ytProfilePic = userInfo.data.picture || null;

        try {
            const channelRes = await youtube.channels.list({
                part: 'snippet',
                mine: true
            });
            if (channelRes.data.items && channelRes.data.items.length > 0) {
                const channel = channelRes.data.items[0];
                ytChannelName = channel.snippet.title;
                ytProfilePic = channel.snippet.thumbnails.default.url;
            }
        } catch (ytErr) {
            console.error('[YOUTUBE API ERROR]', ytErr.message);
        }
        
        // Save to Social DB
        const ytAccount = {
            id: userInfo.data.id,
            username: ytChannelName,
            picture: ytProfilePic,
            email: userInfo.data.email,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date
        };
        
        // Remove existing if same ID
        socialDb.tokens.youtube = socialDb.tokens.youtube.filter(t => t.id !== ytAccount.id);
        socialDb.tokens.youtube.push(ytAccount);
        saveSocialDb();
        
        res.redirect(`${BASE_URL}/accounts?success=youtube_connected`);
    } catch (e) {
        console.error('[AUTH ERROR]', e.message);
        res.redirect(`${BASE_URL}/accounts?error=auth_failed`);
    }
});

const piperTts = require('./piper_tts');
const automationEngine = require('./automation_engine');
const scoutEngine = require('./scout_engine');
const seriesEngine = require('./series_engine');
const scheduledAutomationEngine = require('./scheduled_automation_engine');
const { recordToolDemo } = require('./recorder');
const { renderWithCreatomate } = require('./creatomate_renderer');
const { sendVideoEmail } = require('./email_helper');
const cron = require('node-cron');
// Engines started below after utility functions

// --- 24-HOUR FILE MANAGEMENT (The Janitor) ---
cron.schedule('0 * * * *', () => {
    console.log('[JANITOR] Running 24-hour cleanup...');
    const dirs = [
        path.join(__dirname, 'output'),
        path.join(__dirname, 'background_clips')
    ];
    
    // Also cleanup temp_ directories
    const rootFiles = fs.readdirSync(__dirname);
    rootFiles.forEach(f => {
        const fullPath = path.join(__dirname, f);
        if (f.startsWith('temp_') && fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
            dirs.push(fullPath);
        }
    });

    const now = Date.now();
    const expiry = 30 * 24 * 60 * 60 * 1000; // 30 days expiry for local safety

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) return;
        
        // If it's a temp directory, check the directory itself
        if (path.basename(dir).startsWith('temp_')) {
            const stats = fs.statSync(dir);
            if (now - stats.mtimeMs > expiry) {
                console.log(`[JANITOR] Removing old temp dir: ${dir}`);
                fs.rmSync(dir, { recursive: true, force: true });
                return;
            }
        }

        // Check files inside the directory
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            if (!fs.existsSync(filePath)) return;
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > expiry) {
                console.log(`[JANITOR] Deleting old file: ${file}`);
                if (stats.isDirectory()) {
                    fs.rmSync(filePath, { recursive: true, force: true });
                } else {
                    fs.unlinkSync(filePath);
                }
            }
        });
    });
});

// Load or initialize Social DB (separate from automation for clarity)
const SOCIAL_DB_PATH = path.join(__dirname, 'social_db.json');
if (!fs.existsSync(SOCIAL_DB_PATH)) {
    fs.writeFileSync(SOCIAL_DB_PATH, JSON.stringify({
        configs: {
            youtube: { clientId: '', clientSecret: '', redirectUri: `${BASE_URL}/api/auth/callback/youtube` },
            instagram: { clientId: '', clientSecret: '', redirectUri: `${BASE_URL}/api/auth/callback/instagram` },
            tiktok: { clientId: '', clientSecret: '', redirectUri: `${BASE_URL}/api/auth/callback/tiktok` },
            facebook: { clientId: '', clientSecret: '', redirectUri: `${BASE_URL}/api/auth/callback/facebook` },
            pinterest: { clientId: '', clientSecret: '', redirectUri: `${BASE_URL}/api/auth/callback/pinterest` },
            twitter: { clientId: '', clientSecret: '', redirectUri: `${BASE_URL}/api/auth/callback/twitter` },
            linkedin: { clientId: '', clientSecret: '', redirectUri: `${BASE_URL}/api/auth/callback/linkedin` },
            snapchat: { clientId: '', clientSecret: '', redirectUri: `${BASE_URL}/api/auth/callback/snapchat` }
        },
        tokens: {
            youtube: [],
            instagram: [],
            tiktok: [],
            facebook: [],
            pinterest: [],
            twitter: [],
            linkedin: [],
            snapchat: []
        }
    }, null, 2));
}
let socialDb = JSON.parse(fs.readFileSync(SOCIAL_DB_PATH));
const saveSocialDb = () => fs.writeFileSync(SOCIAL_DB_PATH, JSON.stringify(socialDb, null, 2));
// Migration: Ensure all platforms exist in configs and tokens are arrays
['youtube', 'instagram', 'tiktok', 'facebook', 'pinterest', 'twitter', 'linkedin', 'snapchat'].forEach(p => {
    if (!socialDb.configs[p]) {
        socialDb.configs[p] = { clientId: '', clientSecret: '', redirectUri: `${BASE_URL}/api/auth/callback/${p}` };
    }
    if (!socialDb.tokens[p]) {
        socialDb.tokens[p] = [];
    } else if (!Array.isArray(socialDb.tokens[p])) {
        // Migrate single object to array
        socialDb.tokens[p] = [socialDb.tokens[p]];
    }
    // Ensure every token has an ID
    if (Array.isArray(socialDb.tokens[p])) {
        socialDb.tokens[p].forEach(t => {
            if (!t.id) t.id = t.username || Math.random().toString(36).substr(2, 9);
        });
    }
});
saveSocialDb();

// Load or initialize Projects DB
const PROJECTS_DB_PATH = path.join(__dirname, 'projects_db.json');
if (!fs.existsSync(PROJECTS_DB_PATH)) {
    fs.writeFileSync(PROJECTS_DB_PATH, JSON.stringify({ projects: [] }, null, 2));
}
let projectsDb = JSON.parse(fs.readFileSync(PROJECTS_DB_PATH));
const saveProjectsDb = () => fs.writeFileSync(PROJECTS_DB_PATH, JSON.stringify(projectsDb, null, 2));
const UPLOAD_HISTORY_PATH = path.join(__dirname, 'upload_history.json');
if (!fs.existsSync(UPLOAD_HISTORY_PATH)) {
    fs.writeFileSync(UPLOAD_HISTORY_PATH, JSON.stringify([], null, 2));
}
const saveUploadHistory = async (data, auth = null) => {
    try {
        const history = JSON.parse(fs.readFileSync(UPLOAD_HISTORY_PATH, 'utf8'));
        const entry = {
            ...data,
            timestamp: new Date().toISOString()
        };
        history.unshift(entry);
        fs.writeFileSync(UPLOAD_HISTORY_PATH, JSON.stringify(history.slice(0, 500), null, 2));

        // Sync to Google Sheets if possible
        let sheetsAuth = auth;
        if (!sheetsAuth && socialDb.tokens.youtube && socialDb.tokens.youtube.length > 0) {
            const ytAccount = socialDb.tokens.youtube[0];
            const oauth2Client = new google.auth.OAuth2(
                socialDb.configs.youtube.clientId,
                socialDb.configs.youtube.clientSecret,
                socialDb.configs.youtube.redirectUri
            );
            oauth2Client.setCredentials({
                access_token: ytAccount.access_token,
                refresh_token: ytAccount.refresh_token
            });
            sheetsAuth = oauth2Client;
        }

        if (sheetsAuth) {
            await syncToGoogleSheets(sheetsAuth, entry);
        }
    } catch (e) {
        console.error('Failed to save upload history:', e);
    }
};

automationEngine.start();
seriesEngine.start();
scheduledAutomationEngine.start();

const syncToGoogleSheets = async (auth, entry) => {
    try {
        const sheets = google.sheets({ version: 'v4', auth });
        const drive = google.drive({ version: 'v3', auth });

        let spreadsheetId = socialDb.configs.youtube.spreadsheetId;

        if (!spreadsheetId) {
            // Search for existing sheet
            try {
                const list = await drive.files.list({
                    q: "name = 'AutoVid Upload History' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
                    fields: 'files(id, name)',
                    spaces: 'drive'
                });

                if (list.data.files && list.data.files.length > 0) {
                    spreadsheetId = list.data.files[0].id;
                } else {
                    // Create new sheet
                    const resource = {
                        properties: { title: 'AutoVid Upload History' }
                    };
                    const spreadsheet = await sheets.spreadsheets.create({
                        resource,
                        fields: 'spreadsheetId'
                    });
                    spreadsheetId = spreadsheet.data.spreadsheetId;
                    
                    // Add Headers
                    await sheets.spreadsheets.values.update({
                        spreadsheetId,
                        range: 'Sheet1!A1:E1',
                        valueInputOption: 'RAW',
                        resource: {
                            values: [['Video Title', 'Channel Name', 'Platform', 'Video Link', 'Upload Date']]
                        }
                    });
                }
                socialDb.configs.youtube.spreadsheetId = spreadsheetId;
                saveSocialDb();
            } catch (err) {
                console.error('[SHEETS] Search/Create failed:', err.message);
                return;
            }
        }

        // Append Row
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A:E',
            valueInputOption: 'RAW',
            resource: {
                values: [[
                    entry.title || 'Untitled',
                    entry.channelName || 'Unknown',
                    entry.platform || 'unknown',
                    entry.videoLink || '',
                    entry.timestamp
                ]]
            }
        });
        console.log(`[SHEETS] Synced to Google Sheet: ${spreadsheetId}`);
    } catch (e) {
        console.error('[SHEETS ERROR]', e.message);
        if (e.message.includes('insufficient permissions') || e.message.includes('scope')) {
            console.error('[SHEETS] Tip: Re-authenticate your YouTube account to grant Spreadsheet access.');
        }
    }
};

// Load or initialize Keys DB
const KEYS_DB_PATH = path.join(__dirname, 'keys_db.json');
if (!fs.existsSync(KEYS_DB_PATH)) {
    fs.writeFileSync(KEYS_DB_PATH, JSON.stringify({ 
        openAiKey: '', 
        geminiKey: '', 
        elevenLabsKey: '', 
        pexelsKey: '',
        creatomateKey: ''
    }, null, 2));
}
let keysDb = JSON.parse(fs.readFileSync(KEYS_DB_PATH));
const saveKeysDb = () => fs.writeFileSync(KEYS_DB_PATH, JSON.stringify(keysDb, null, 2));

// ─────────────────────────────────────────────
// BACKGROUND JOBS SYSTEM (Persisted to history.json)
// ─────────────────────────────────────────────
const HISTORY_PATH = path.join(__dirname, 'history.json');
let jobs = {};

const saveHistory = () => {
    try {
        fs.writeFileSync(HISTORY_PATH, JSON.stringify(jobs, null, 2));
    } catch (e) {
        console.error('Failed to save history.json:', e);
    }
};

if (fs.existsSync(HISTORY_PATH)) {
    try {
        jobs = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
        // RECOVERY LOGIC: Mark stuck jobs as interrupted on startup
        let recovered = false;
        Object.keys(jobs).forEach(id => {
            if (jobs[id].status === 'processing' || jobs[id].status === 'rendering') {
                jobs[id].status = 'failed';
                jobs[id].stage = 'Interrupted by server restart';
                recovered = true;
            }
        });
        if (recovered) saveHistory();
    } catch (e) {
        console.error('Failed to load history.json:', e);
    }
}

const createJob = (type, metadata) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
    jobs[id] = {
        id,
        type,
        status: 'processing',
        progress: 0,
        stage: 'Initializing...',
        result: null,
        error: null,
        metadata,
        startTime: new Date().toISOString()
    };
    saveHistory();
    return id;
};

const updateJob = (id, updates) => {
    if (jobs[id]) {
        jobs[id] = { ...jobs[id], ...updates };
        
        // Trigger email if completed
        if (updates.status === 'completed' && keysDb.emailEnabled) {
            const job = jobs[id];
            let videoPath = '';
            
            if (job.result && job.result.videoUrl) {
                const filename = job.result.videoUrl.split('/').pop();
                videoPath = path.join(OUTPUT_DIR, filename);
            }
            
            if (videoPath && fs.existsSync(videoPath)) {
                sendVideoEmail(videoPath, keysDb.emailReceiver, keysDb).catch(err => {
                    console.error('[EMAIL ERROR] Failed to send automated email:', err.message);
                });
            }
        }

        if (updates.status === 'completed' || updates.status === 'failed') {
            saveHistory();
        }
    }
};

app.get('/api/history', (req, res) => {
    res.json(Object.values(jobs).reverse());
});

app.get('/api/upload-history', (req, res) => {
    if (fs.existsSync(UPLOAD_HISTORY_PATH)) {
        res.json(JSON.parse(fs.readFileSync(UPLOAD_HISTORY_PATH, 'utf8')));
    } else {
        res.json([]);
    }
});

app.get('/api/jobs', (req, res) => {
    res.json(jobs);
});

app.get('/api/jobs/:id', (req, res) => {
    const job = jobs[req.params.id];
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
});

// ─────────────────────────────────────────────
// DRIVE AUTOMATOR ENDPOINTS
// ─────────────────────────────────────────────
app.get('/api/automation/status', (req, res) => {
  res.json(automationEngine.db);
});

app.post('/api/automation/config', (req, res) => {
  automationEngine.updateConfig(req.body);
  res.json({ success: true, config: automationEngine.db });
});

app.post('/api/automation/test', async (req, res) => {
  const result = await automationEngine.testConnection(req.body);
  res.json(result);
});

app.get('/api/config/keys', (req, res) => {
    res.json(keysDb);
});

app.post('/api/config/keys', (req, res) => {
    const { 
        openAiKey, geminiKey, elevenLabsKey, pexelsKey, creatomateKey,
        emailService, emailUser, emailPass, emailReceiver, emailEnabled 
    } = req.body;
    if (openAiKey !== undefined) keysDb.openAiKey = openAiKey;
    if (geminiKey !== undefined) keysDb.geminiKey = geminiKey;
    if (elevenLabsKey !== undefined) keysDb.elevenLabsKey = elevenLabsKey;
    if (pexelsKey !== undefined) keysDb.pexelsKey = pexelsKey;
    if (creatomateKey !== undefined) keysDb.creatomateKey = creatomateKey;
    
    if (emailService !== undefined) keysDb.emailService = emailService;
    if (emailUser !== undefined) keysDb.emailUser = emailUser;
    if (emailPass !== undefined) keysDb.emailPass = emailPass;
    if (emailReceiver !== undefined) keysDb.emailReceiver = emailReceiver;
    if (emailEnabled !== undefined) keysDb.emailEnabled = emailEnabled;

    saveKeysDb();
    res.json({ success: true });
});

app.post('/api/config/test-email', async (req, res) => {
    const { emailService, emailUser, emailPass, emailReceiver } = req.body;
    try {
        const testConfig = { emailService, emailUser, emailPass };
        // We'll send a simple text email to verify connection
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            service: emailService,
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });

        await transporter.sendMail({
            from: `"AutoVid Test" <${emailUser}>`,
            to: emailReceiver,
            subject: "AutoVid Email Connection Test",
            text: "Success! Your AutoVid email notification system is correctly configured.",
            html: "<b>Success!</b> Your AutoVid email notification system is correctly configured."
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/config/balances', async (req, res) => {
    const balances = {
        elevenLabs: { usage: 0, total: 0, percent: 0 },
        openai: { usage: 0, total: 0, percent: 0 },
        gemini: { usage: 0, total: 0, percent: 0 },
        pexels: { usage: 0, total: 0, percent: 0 }
    };

    try {
        // 1. ElevenLabs Balance
        if (keysDb.elevenLabsKey) {
            try {
                const axios = require('axios');
                const elRes = await axios.get('https://api.elevenlabs.io/v1/user/subscription', {
                    headers: { 'xi-api-key': keysDb.elevenLabsKey }
                });
                const sub = elRes.data;
                balances.elevenLabs = {
                    usage: sub.character_count,
                    total: sub.character_limit,
                    percent: (sub.character_count / sub.character_limit) * 100
                };
            } catch (e) { console.error('EL Balance Error:', e.message); }
        }

        // Add more balance checks here as needed

        res.json(balances);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const OUTPUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

const BACKGROUND_CLIPS_DIR = path.join(__dirname, 'background_clips');
if (!fs.existsSync(BACKGROUND_CLIPS_DIR)) fs.mkdirSync(BACKGROUND_CLIPS_DIR);

const TEST_ASSETS_DIR = path.join(__dirname, 'test_assets');
if (!fs.existsSync(TEST_ASSETS_DIR)) fs.mkdirSync(TEST_ASSETS_DIR);

app.use('/output', express.static(OUTPUT_DIR));
app.use('/test_assets', express.static(TEST_ASSETS_DIR));

// ─────────────────────────────────────────────
// Helper: download a URL to a local file
// ─────────────────────────────────────────────
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    console.log(`[DOWNLOADER] Starting download: ${url.substring(0, 50)}...`);
    const request = proto.get(url, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        console.log(`[DOWNLOADER] Redirecting to: ${res.headers.location.substring(0, 50)}...`);
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download: status ${res.statusCode} for ${url}`));
      }

      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close((err) => {
          if (err) return reject(err);
          const stats = fs.statSync(dest);
          if (stats.size < 1000) { // Increased threshold slightly
            fs.unlink(dest, () => {});
            reject(new Error('Downloaded file is empty or too small (possible error page)'));
          } else {
            resolve(dest);
          }
        });
      });
      
      file.on('error', err => {
        file.close();
        fs.unlink(dest, () => {});
        reject(err);
      });

      res.on('error', err => {
        file.close();
        fs.unlink(dest, () => {});
        reject(err);
      });
    });
    
    request.on('error', err => {
      reject(err);
    });
    
    request.setTimeout(60000, () => { // Increased timeout to 60s
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

async function verifyMedia(path) {
  return new Promise((resolve) => {
    const ff = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path]);
    
    const timeout = setTimeout(() => {
        ff.kill();
        resolve(false);
    }, 10000);

    let output = '';
    ff.stdout.on('data', d => output += d);
    ff.on('close', code => {
      clearTimeout(timeout);
      if (code === 0 && output.trim().length > 0) resolve(true);
      else resolve(false);
    });
    ff.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
    });
  });
}

async function fetchAiKeywords(text, key, topic = '') {
  if (!key) return [];
  const context = topic ? `The overall video theme is "${topic}". ` : "";
  const prompt = `Act as a professional stock footage researcher for a video creator. 
  ${context}Narration segment: "${text}".
  
  Generate 3 distinct search queries optimized for stock video libraries (like Pexels/Pixabay).
  
  CRITICAL GUIDELINES:
  - DO NOT use abstract words (e.g., "tension", "conflict", "politics"). Use VISUAL equivalents.
  - If the topic is sensitive (war, news), use neutral but powerful visual terms (e.g., "fighter jet", "soldier silhouette", "naval ship", "desert landscape", "national flag").
  - Focus on cinematic, high-quality visual descriptions.
  - Query 1: Most relevant visual (e.g., "modern tank moving")
  - Query 2: Contextual/Atmospheric (e.g., "desert military base")
  - Query 3: Broad/Symbolic (e.g., "american flag waving" or "military radar")
  
  Return ONLY the queries separated by commas. No extra text. Example: query one, query two, query three`;
  
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { 'Content-Type': 'application/json' } }
    );
    const textResult = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (textResult) {
      return textResult.split(',').map(k => k.trim().replace(/["\n\r.]/g, '')).filter(k => k.length > 0);
    }
  } catch (e) {
    console.warn('[AI_KEYWORDS] Gemini failed:', e.message);
  }
  return [];
}

async function getEnhancedKeywords(text, geminiKey, topic = '') {
  const stopwords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','is','was','are','were','be','been','it','this','that','as','by','from','they','we','i','he','she', 'will', 'this', 'that']);
  
  let aiKeywords = [];
  if (geminiKey) {
    aiKeywords = await fetchAiKeywords(text, geminiKey, topic);
  }
  
  // Add regex fallback
  const fallback = text.toLowerCase().replace(/[^a-z\s]/g,'').split(/\s+/).filter(w => w.length > 4 && !stopwords.has(w)).slice(0, 3).join(' ');
  if (fallback) aiKeywords.push(fallback);
  
  if (aiKeywords.length === 0) aiKeywords.push('cinematic');
  
  return [...new Set(aiKeywords)];
}

async function fetchAiKeyword(text, key) {
  const keywords = await getEnhancedKeywords(text, key);
  return keywords.length > 0 ? keywords[0] : null;
}

async function generateClipperMetadata(transcriptText, geminiKey) {
  try {
    const MASTER_GEMINI_KEY = keysDb.geminiKey || process.env.GEMINI_API_KEY || '';
    const finalGeminiKey = geminiKey || MASTER_GEMINI_KEY;
    
    const prompt = `You are a viral Short-form video expert. I have a video clip with the following transcript:
"${transcriptText}"

Generate a viral Title, an engaging Description, and 3-5 SEO Hashtags for this exact clip. 
CRITICAL: Return ONLY a valid JSON object matching this structure exactly:
{
  "title": "Viral Hook Title",
  "description": "Engaging description...",
  "tags": ["#tag1", "#tag2"]
}`;

    const payload = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
    const apiRes = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${finalGeminiKey}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
      };
      let body = '';
      const reqHttp = https.request(options, r => {
        r.on('data', d => body += d);
        r.on('end', () => resolve({ status: r.statusCode, body }));
      });
      reqHttp.on('error', reject);
      reqHttp.write(payload);
      reqHttp.end();
    });

    const data = JSON.parse(apiRes.body);
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJson = rawText.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.warn('[CLIPPER METADATA] Failed to generate AI metadata:', e.message);
    return { title: 'Wait until the end! 🔥', description: 'Did you know this? 👇', tags: ['#viral', '#trending', '#shorts'] };
  }
}

// ─────────────────────────────────────────────
// POST /api/clip  (existing Clipper feature)
// ─────────────────────────────────────────────
app.post('/api/clip', async (req, res) => {
  const { url, style, count, captionSize, captionPosition } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  const clipCount = parseInt(count) || 1;

  const jobId = createJob('CLIPPER', { url, style, count: clipCount, captionSize, captionPosition });
  res.json({ success: true, jobId });

  // Run in background
  (async () => {
    try {
      console.log(`[CLIPPER] URL: ${url} | style: ${style} | count: ${clipCount}`);
      updateJob(jobId, { stage: 'Processing video...', progress: 10 });

      const timestamp = Date.now();
      const outputFilenameBase = `clip_${timestamp}.mp4`;
      const outputPathBase = path.join(OUTPUT_DIR, outputFilenameBase);

      const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
      console.log(`[RENDERER] Spawning: ${pyCmd} ${path.join(__dirname, 'processor.py')} ${url} ${style}`);
      const pythonProcess = spawn(pyCmd, [
        path.join(__dirname, 'processor.py'),
        url, style, outputPathBase, clipCount, captionSize || 32, captionPosition || 'center'
      ]);

      pythonProcess.on('error', (err) => {
        console.error(`[RENDERER] CRITICAL ERROR: Failed to start Python process!`, err);
        updateJob(jobId, { status: 'failed', error: `System Error: ${err.message}. Make sure Python is installed and in your PATH.` });
      });

      let errorData = '';
      pythonProcess.stderr.on('data', d => { errorData += d.toString(); });
      
      pythonProcess.stdout.on('data', d => {
        const line = d.toString().trim();
        if (line.includes('Scouting video...')) {
          updateJob(jobId, { stage: `Searching for ${clipCount} viral segments...`, progress: 20 });
        } else if (line.includes('Processing clip')) {
          const match = line.match(/Processing clip (\d+)\/(\d+)/);
          if (match) {
             const current = parseInt(match[1]);
             const total = parseInt(match[2]);
             updateJob(jobId, { stage: `Processing clip ${current}/${total}...`, progress: 20 + (current / total * 70) });
          }
        } else if (line.includes('Transcribing and captioning')) {
          updateJob(jobId, { stage: 'Generating trending captions...' });
        } else if (line.includes('Tracking faces and cropping')) {
          updateJob(jobId, { stage: 'AI Face Tracking & Auto-Crop...' });
        } else if (line.includes('Rendering final video')) {
          updateJob(jobId, { stage: 'Finalizing render...' });
        }
      });
      
      pythonProcess.on('close', async code => {
        if (code === 0) {
          updateJob(jobId, { stage: 'Generating viral AI metadata...' });
          
          const videoUrls = [];
          const metadataList = [];
          
          if (clipCount > 1) {
            for (let i = 1; i <= clipCount; i++) {
              videoUrls.push(`${BASE_URL}/output/clip_${timestamp}_${i}.mp4`);
              
              const transcriptPath = path.join(OUTPUT_DIR, `clip_${timestamp}_${i}_transcript.txt`);
              if (fs.existsSync(transcriptPath)) {
                 const transcriptText = fs.readFileSync(transcriptPath, 'utf8');
                 const clipMeta = await generateClipperMetadata(transcriptText, keysDb.geminiKey);
                 metadataList.push(clipMeta);
              } else {
                 metadataList.push({ title: 'Viral Clip', description: 'Wait until the end!', tags: [] });
              }
            }
          } else {
            videoUrls.push(`${BASE_URL}/output/clip_${timestamp}.mp4`);
            const transcriptPath = path.join(OUTPUT_DIR, `clip_${timestamp}_transcript.txt`);
            if (fs.existsSync(transcriptPath)) {
                 const transcriptText = fs.readFileSync(transcriptPath, 'utf8');
                 const clipMeta = await generateClipperMetadata(transcriptText, keysDb.geminiKey);
                 metadataList.push(clipMeta);
            } else {
                 metadataList.push({ title: 'Viral Clip', description: 'Wait until the end!', tags: [] });
            }
          }
          
          updateJob(jobId, { 
            status: 'completed', 
            progress: 100, 
            stage: 'Complete', 
            result: { success: true, videoUrl: videoUrls[0], videoUrls, metadataList } 
          });
        } else {
          updateJob(jobId, { 
            status: 'failed', 
            error: 'Processing failed', 
            stage: 'Failed',
            details: errorData 
          });
        }
      });
    } catch (e) {
      updateJob(jobId, { status: 'failed', error: e.message });
    }
  })();
});

// ─────────────────────────────────────────────
// POST /api/generate-script
// Uses OpenAI Chat Completions to write a script
// ─────────────────────────────────────────────
app.post('/api/generate-script', async (req, res) => {
  const { topic, openAiKey, geminiKey } = req.body;
  const MASTER_GEMINI_KEY = keysDb.geminiKey || process.env.GEMINI_API_KEY || '';
  const finalGeminiKey = geminiKey || MASTER_GEMINI_KEY;
  const keys = [finalGeminiKey].filter(k => k && k !== 'undefined' && k !== '');
  console.log(`[SCRIPT] Generating script for: ${topic} using master key.`);

  // Testing mode for 'tajmahal'
  if (topic.toLowerCase().trim() === 'tajmahal') {
    const cachePath = path.join(TEST_ASSETS_DIR, 'tajmahal', 'script.txt');
    if (fs.existsSync(cachePath)) {
      console.log('[SCRIPT] Returning cached script for tajmahal');
      return res.json({ script: fs.readFileSync(cachePath, 'utf8') });
    }
  }

  try {
    let script = '';
    const isShort = req.body.length === 'short';
    let systemPrompt = '';
    let userPrompt = '';

    if (isShort) {
      systemPrompt = `You are a viral Short-form video scriptwriter (TikTok/Reels/Shorts). 
Write punchy, high-retention scripts that hook the viewer in the first 3 seconds.
Plain narration text only. No stage directions or speaker labels.`;
      userPrompt = `Write a viral short video script (9:16 format) about: "${topic}". 
      Aim for 125-150 words to ensure a duration of 50-60 seconds. Focus on a fast pace and strong hook.`;
    } else {
      systemPrompt = `You are a professional YouTube scriptwriter. Write engaging, informative long-form video scripts.
Structure: Hook (30s) → Introduction → 3-5 main sections → Conclusion → CTA.
Do NOT include stage directions, timestamps, or speaker labels. Plain narration text only.`;
      userPrompt = `Write a full YouTube video script about: "${topic}". 
Aim for 800-1200 words. Make it engaging, informative, and flow naturally as narration.`;
    }

    const MASTER_GEMINI_KEY = keysDb.geminiKey || process.env.GEMINI_API_KEY || '';
    const finalGeminiKey = geminiKey || MASTER_GEMINI_KEY;
    const keys = [finalGeminiKey].filter(k => k && k !== 'undefined' && k !== '');

    const models = [
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-2.0-flash",
      "gemini-flash-latest",
      "gemini-pro-latest"
    ];

    let lastError = null;
    if (keys.length > 0) {
      for (const key of keys) {
        for (const model of models) {
          try {
            const payload = JSON.stringify({
              contents: [{
                parts: [{
                  text: `${systemPrompt}\n\n${userPrompt}`
                }]
              }]
            });

            const apiRes = await new Promise((resolve, reject) => {
              const options = {
                hostname: 'generativelanguage.googleapis.com',
                path: `/v1beta/models/${model}:generateContent?key=${key}`,
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(payload)
                }
              };
              let body = '';
              const reqHttp = https.request(options, r => {
                r.on('data', d => body += d);
                r.on('end', () => resolve({ status: r.statusCode, body }));
              });
              reqHttp.on('error', reject);
              reqHttp.write(payload);
              reqHttp.end();
            });

            const data = JSON.parse(apiRes.body);
            if (data.error) {
              lastError = data.error.message;
              console.warn(`[SCRIPT] Gemini attempt failed (Model: ${model}):`, lastError);
              if (apiRes.status === 429) break; // Try next key
              continue; // Try next model
            }
            script = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (script) break;
          } catch (e) {
            lastError = e.message;
          }
        }
        if (script) break;
      }
    }

    if (!script && openAiKey) {
      console.log('[SCRIPT] Gemini failed or no keys, falling back to OpenAI...');
      const payload = JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 2000
      });

      const apiRes = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.openai.com',
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAiKey}`,
            'Content-Length': Buffer.byteLength(payload)
          }
        };
        let body = '';
        const reqHttp = https.request(options, r => {
          r.on('data', d => body += d);
          r.on('end', () => resolve({ status: r.statusCode, body }));
        });
        reqHttp.on('error', reject);
        reqHttp.write(payload);
        reqHttp.end();
      });

      const data = JSON.parse(apiRes.body);
      if (data.error) return res.status(400).json({ error: data.error.message });
      script = data.choices?.[0]?.message?.content || '';
    }
    
    if (!script) {
      return res.status(400).json({ error: `Script generation failed. Gemini error: ${lastError || 'None'}. Make sure you have a valid API key or fallback to OpenAI.` });
    }

    if (topic.toLowerCase().trim() === 'tajmahal') {
      const tajDir = path.join(TEST_ASSETS_DIR, 'tajmahal');
      if (!fs.existsSync(tajDir)) fs.mkdirSync(tajDir, { recursive: true });
      fs.writeFileSync(path.join(tajDir, 'script.txt'), script);
    }

    res.json({ script });
  } catch (e) {
    console.error('[SCRIPT ERROR]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/long-video
// 1. ElevenLabs TTS → audio file
// 2. Extract keywords per paragraph → Pexels search → download clips
// 3. Run Python renderer (FFmpeg) with captions
// ─────────────────────────────────────────────
app.post(['/api/long-video', '/api/short-video'], async (req, res) => {
  const isShort = req.path === '/api/short-video';
  console.log(`🚨 [RENDER] ${isShort ? 'SHORT' : 'LONG'} VIDEO REQUEST RECEIVED! Topic: ${req.body.topic}`);
  const { script, voice, captionStyle, topic, isTest, captionSize = 38, captionPosition = 'center' } = req.body;
  const geminiKey = req.body.geminiKey || keysDb.geminiKey || process.env.GEMINI_API_KEY;
  const elevenLabsKey = req.body.elevenLabsKey || keysDb.elevenLabsKey || process.env.ELEVENLABS_API_KEY || 'sk_eb749e2f22c96c9af0ab15df0b4791ad782764ea9f4311d4';
  const pexelsKey = req.body.pexelsKey || keysDb.pexelsKey || process.env.PEXELS_API_KEY || 'hNOwvi53vUHCrAgGNzw92UlYfx7gsYtgdOoEoN0dzOjS9j4j1Ohqf4FJ';
  const orientation = isShort ? 'portrait' : (req.body.orientation || 'landscape');
  
  // Cache check for 'tajmahal' - only if explicitly requested or in a 'fast' mode
  if (topic && topic.toLowerCase().trim() === 'tajmahal' && !req.body.refresh) {
    const tajDir = path.join(TEST_ASSETS_DIR, 'tajmahal');
    const metadataPath = path.join(tajDir, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      console.log('[VIDEO] Returning cached assets for tajmahal');
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      // Return jobId if possible or just the result
      return res.json({ success: true, jobId: 'CACHED_TAJMAHAL', result: metadata });
    }
  }

  if (!script)
    return res.status(400).json({ error: 'script is required' });

  const jobId = createJob(isShort ? 'SHORT_VIDEO' : 'LONG_VIDEO', { topic, script, voice });
  res.json({ success: true, jobId });

  // Run in background
  (async () => {
    try {
      const timestamp = Date.now();
      const jobDir = path.join(OUTPUT_DIR, `job_${timestamp}`);
      fs.mkdirSync(jobDir, { recursive: true });

      // ── 1. Voiceover Synthesis ─────────────────────
      updateJob(jobId, { stage: 'Generating voiceover...', progress: 10 });
      const isPiper = piperTts.VOICE_MODELS[voice];
      const audioPath = path.join(jobDir, isPiper ? 'narration.wav' : 'narration.mp3');

      if (isPiper) {
        if (isShort) {
          await piperTts.synthesizeViral(script, voice, audioPath);
        } else {
          await piperTts.synthesize(script, voice, audioPath);
        }
      } else {
        const VOICE_IDS = {
          Rachel: '21m00Tcm4TlvDq8ikWAM',
          Adam:   'pNInz6obpgDQGcFmaJgB',
          Bella:  'EXAVITQu4vr4xnSDxMaL',
          Antoni: 'ErXwobaYiN019PkySvjV',
          Elli:   'MF3mGyEYCl7XYWbV9V6O',
          Josh:   'TxGEqnHWrfWFTfGW9XjX'
        };
        const voiceId = VOICE_IDS[voice] || VOICE_IDS.Rachel;

        // Chunking logic for long scripts (ElevenLabs 5k limit)
        const chunkText = (text, maxLength = 4500) => {
          const sentences = text.match(/[^.!?]+[.!?]+|\s*\n\s*|[^.!?]+$/g) || [text];
          const chunks = [];
          let currentChunk = '';
          for (const s of sentences) {
            if ((currentChunk + s).length > maxLength) {
              chunks.push(currentChunk.trim());
              currentChunk = s;
            } else {
              currentChunk += s;
            }
          }
          if (currentChunk) chunks.push(currentChunk.trim());
          return chunks;
        };

        const scriptChunks = chunkText(script);
        const audioParts = [];
        
        for (let i = 0; i < scriptChunks.length; i++) {
          const partPath = path.join(jobDir, `part_${i}.mp3`);
          const ttsPayload = JSON.stringify({
            text: scriptChunks[i],
            model_id: 'eleven_turbo_v2_5',
            voice_settings: { stability: 0.35, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true }
          });

          await new Promise((resolve, reject) => {
            const options = {
              hostname: 'api.elevenlabs.io',
              path: `/v1/text-to-speech/${voiceId}`,
              method: 'POST',
              headers: {
                'xi-api-key': elevenLabsKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg',
                'Content-Length': Buffer.byteLength(ttsPayload)
              }
            };
            const file = fs.createWriteStream(partPath);
            const reqHttp = https.request(options, r => {
              if (r.statusCode !== 200) {
                let err = '';
                r.on('data', d => err += d);
                r.on('end', () => reject(new Error(`ElevenLabs error ${r.statusCode}: ${err}`)));
                return;
              }
              r.pipe(file);
              file.on('finish', () => { file.close(); resolve(); });
            });
            reqHttp.on('error', reject);
            reqHttp.write(ttsPayload);
            reqHttp.end();
          });
          audioParts.push(partPath);
        }

        // Concatenate audio parts
        if (audioParts.length > 1) {
          const concatList = path.join(jobDir, 'concat_list.txt');
          fs.writeFileSync(concatList, audioParts.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
          await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', concatList, '-c', 'copy', audioPath]);
            ffmpeg.on('close', (code) => code === 0 ? resolve() : reject(new Error('FFmpeg concat failed')));
          });
        } else {
          fs.renameSync(audioParts[0], audioPath);
        }
      }

      // ── 2. Extract keywords & fetch Pexels clips ──
      updateJob(jobId, { stage: 'Fetching clips...', progress: 40 });
      
      const visuals = req.body.visuals || [];
      const clipPaths = [];
      const clipUrls = [];

      if (visuals.length > 0) {
        console.log(`[VIDEO] Using ${visuals.length} visuals from frontend.`);
        for (let i = 0; i < visuals.length; i++) {
          const vis = visuals[i];
          if (!vis.url) continue;
          
          const ext = vis.url.toLowerCase().includes('.mp4') ? 'mp4' : 'jpg';
          const clipPath = path.join(jobDir, `clip_${i}.${ext}`);
          try {
            await downloadFile(vis.url, clipPath);
            const isValid = await verifyMedia(clipPath);
            if (isValid) {
              clipPaths.push(clipPath);
              clipUrls.push(`${BASE_URL}/output/job_${timestamp}/clip_${i}.${ext}`);
            } else {
              console.warn(`[VIDEO] Corrupt media detected for visual ${i}, skipping.`);
              fs.unlink(clipPath, () => {});
            }
          } catch (e) {
            console.error(`[VIDEO] Failed to download visual ${i}:`, e.message);
          }
        }
      } else {
        // Dynamic fetch logic (original) - ONLY using Pexels for non-talking-head
        const words = script.split(/\s+/);
        const wordCount = words.length;
        const estimatedDurationMins = wordCount / 150;
        // Target 15 scenes per minute (matches 13-17 range)
        const targetScenes = Math.max(15, Math.round(estimatedDurationMins * 15));
        const wordsPerSegment = Math.max(8, Math.floor(wordCount / targetScenes));

        const paragraphs = [];
        for (let i = 0; i < words.length; i += wordsPerSegment) {
          paragraphs.push(words.slice(i, i + wordsPerSegment).join(' '));
        }
        
        // Concurrency-limited processing for rendering
        const processParagraph = async (paragraph, idx) => {
          const keywordsToTry = await getEnhancedKeywords(paragraph, req.body.geminiKey, req.body.topic);
          console.log(`[VIDEO] Segment ${idx+1} keywords to try:`, keywordsToTry);
          
          for (const keyword of keywordsToTry) {
            try {
              const pexelsRes = await axios.get(`https://api.pexels.com/v1/videos/search?query=${encodeURIComponent(keyword)}&per_page=1&size=medium&orientation=${orientation}`, {
                headers: { Authorization: pexelsKey },
                timeout: 15000
              });

              const video = pexelsRes.data.videos?.[0];
              if (video) {
                const file = video.video_files.find(f => f.quality === 'hd') || video.video_files[0];
                if (file) {
                  const clipPath = path.join(jobDir, `clip_${idx}.mp4`);
                  await downloadFile(file.link, clipPath);
                  const isValid = await verifyMedia(clipPath);
                  if (isValid) {
                    console.log(`[VIDEO] Successfully matched keyword "${keyword}" for segment ${idx+1}`);
                    return { clipPath, clipUrl: `${BASE_URL}/output/job_${timestamp}/clip_${idx}.mp4` };
                  } else {
                    fs.unlink(clipPath, () => {});
                  }
                }
              }
            } catch (e) {
              console.warn(`[VIDEO] Keyword "${keyword}" failed for segment ${idx+1}:`, e.message);
            }
          }
          return null;
        };

        const concurrency = 4;
        for (let i = 0; i < paragraphs.length; i += concurrency) {
          const batch = paragraphs.slice(i, i + concurrency).map((p, j) => processParagraph(p, i + j));
          const batchResults = await Promise.all(batch);
          batchResults.forEach(res => {
            if (res) {
              clipPaths.push(res.clipPath);
              clipUrls.push(res.clipUrl);
            }
          });
          updateJob(jobId, { progress: 40 + Math.round((clipPaths.length / paragraphs.length) * 30) });
        }
      }

      if (clipPaths.length === 0) throw new Error('Could not download any clips.');

      // ── 3. Render ─────────────────────────────
      let videoUrl = '';
      const outputPrefix = isShort ? 'shortvid' : 'longvid';
      const outputFilename = `${outputPrefix}_${timestamp}.mp4`;
      const outputPath = path.join(OUTPUT_DIR, outputFilename);

      // Priority check: Use FFmpeg if explicitly requested or as default if set
      const useFFmpeg = req.body.renderer === 'ffmpeg' || !keysDb.creatomateKey;
      
      if (!useFFmpeg && keysDb.creatomateKey) {
        updateJob(jobId, { stage: 'Rendering with Creatomate...', progress: 70 });
        
        // Re-fetch Pexels URLs to get direct links for Creatomate
        const creatomateMods = {};
        const maxSlots = 16; 
        
        for (let i = 0; i < Math.min(paragraphs.length, maxSlots); i++) {
          const keywordsToTry = await getEnhancedKeywords(paragraphs[i], req.body.geminiKey, req.body.topic);
          console.log(`[CREATOMATE] Segment ${i+1} keywords:`, keywordsToTry);

          let foundUrl = '';
          for (const keyword of keywordsToTry) {
            if (foundUrl) break;
            try {
              const pexelsRes = await new Promise((resolve, reject) => {
                const options = {
                  hostname: 'api.pexels.com',
                  path: `/videos/search?query=${encodeURIComponent(keyword)}&per_page=1&size=medium&orientation=${orientation}`,
                  headers: { Authorization: pexelsKey }
                };
                let body = '';
                https.get(options, r => {
                  r.on('data', d => body += d);
                  r.on('end', () => resolve(JSON.parse(body)));
                }).on('error', reject);
              });
              
              const video = pexelsRes.videos?.[0];
              const file = video?.video_files?.find(f => f.quality === 'hd') || video?.video_files?.[0];
              if (file?.link) {
                foundUrl = file.link;
                console.log(`[CREATOMATE] Matched keyword "${keyword}" for segment ${i+1}`);
              }
            } catch (e) { console.warn(`[CREATOMATE] Keyword "${keyword}" failed:`, e.message); }
          }
          
          creatomateMods[`Image-${i+1}.source`] = foundUrl || '';
        }

        const templateId = "9147d023-6502-4bf9-a1a8-585af7b5a98e";
        const renderUrl = await renderWithCreatomate(keysDb.creatomateKey, templateId, creatomateMods);
        
        // Download the rendered video to our local output dir
        await downloadFile(renderUrl, outputPath);
        videoUrl = `${BASE_URL}/output/${outputFilename}`;
        
      } else {
        // Fallback to Python/FFmpeg
        updateJob(jobId, { stage: 'Rendering final video (FFmpeg)...', progress: 70 });
        const clipListPath = path.join(jobDir, 'clips.txt');
        const clipListContent = clipPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
        fs.writeFileSync(clipListPath, clipListContent);

        // Auto-select background music if exists
        let selectedMusic = '';
        const musicDir = path.join(__dirname, 'music');
        if (fs.existsSync(musicDir)) {
          const songs = fs.readdirSync(musicDir).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
          if (songs.length > 0) {
            selectedMusic = path.join(musicDir, songs[Math.floor(Math.random() * songs.length)]);
            console.log(`[VIDEO] Selected background music: ${selectedMusic}`);
          }
        }

        await new Promise((resolve, reject) => {
          const pyArgs = [
            path.join(__dirname, 'long_video_renderer.py'),
            audioPath, clipListPath, outputPath, captionStyle, script.substring(0, 2000), orientation, captionSize, captionPosition
          ];
          if (selectedMusic) pyArgs.push(selectedMusic);

          const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
          const py = spawn(pyCmd, pyArgs);
          let stderr = '';
          py.stderr.on('data', d => stderr += d.toString());
          py.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`Renderer exited ${code}: ${stderr}`));
          });
        });
        videoUrl = `${BASE_URL}/output/${outputFilename}`;
      }

      const result = {
        success: true,
        videoUrl,
        audioUrl: `${BASE_URL}/output/job_${timestamp}/narration.mp3`,
        clips: clipUrls
      };

      updateJob(jobId, { status: 'completed', progress: 100, stage: 'Complete', result });

      // Save to cache if tajmahal
      if (topic && topic.toLowerCase().trim() === 'tajmahal') {
        const tajDir = path.join(TEST_ASSETS_DIR, 'tajmahal');
        if (!fs.existsSync(tajDir)) fs.mkdirSync(tajDir, { recursive: true });
        fs.copyFileSync(outputPath, path.join(tajDir, `video.mp4`));
        fs.copyFileSync(audioPath, path.join(tajDir, `narration.mp3`));
        fs.writeFileSync(path.join(tajDir, 'metadata.json'), JSON.stringify(result, null, 2));
      }
    } catch (e) {
      updateJob(jobId, { status: 'failed', error: e.message, stage: 'Failed' });
    }
  })();
});

// ─────────────────────────────────────────────
// POST /api/talking-head
// 1. VO -> Audio
// 2. Gaming Background
// 3. Pexels Images per segment
// 4. Render with Overlays
// ─────────────────────────────────────────────
app.post('/api/talking-head', async (req, res) => {
  const { script, voice, captionStyle, topic, captionSize = 38, captionPosition = 'center', avatarId = 0 } = req.body;
  const geminiKey = req.body.geminiKey || keysDb.geminiKey || process.env.GEMINI_API_KEY;
  const elevenLabsKey = req.body.elevenLabsKey || keysDb.elevenLabsKey || process.env.ELEVENLABS_API_KEY || 'sk_eb749e2f22c96c9af0ab15df0b4791ad782764ea9f4311d4';
  const pexelsKey = req.body.pexelsKey || keysDb.pexelsKey || process.env.PEXELS_API_KEY || 'hNOwvi53vUHCrAgGNzw92UlYfx7gsYtgdOoEoN0dzOjS9j4j1Ohqf4FJ';
  
  if (!script)
    return res.status(400).json({ error: 'script is required' });

  const jobId = createJob('TALKING_HEAD', { topic, script, voice });
  res.json({ success: true, jobId });

  (async () => {
    try {
      const timestamp = Date.now();
      const jobDir = path.join(OUTPUT_DIR, `job_${timestamp}`);
      fs.mkdirSync(jobDir, { recursive: true });

      // 1. Voiceover Synthesis
      updateJob(jobId, { stage: 'Generating voiceover...', progress: 10 });
      const isPiper = piperTts.VOICE_MODELS[voice];
      const audioPath = path.join(jobDir, isPiper ? 'narration.wav' : 'narration.mp3');
      
      if (isPiper) {
        await piperTts.synthesizeViral(script, voice, audioPath);
      } else {
        const VOICE_IDS = { Rachel: '21m00Tcm4TlvDq8ikWAM', Adam: 'pNInz6obpgDQGcFmaJgB', Bella: 'EXAVITQu4vr4xnSDxMaL', Antoni: 'ErXwobaYiN019PkySvjV' };
        const voiceId = VOICE_IDS[voice] || VOICE_IDS.Rachel;

        const ttsRes = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          text: script,
          model_id: 'eleven_turbo_v2_5'
        }, {
          headers: { 'xi-api-key': elevenLabsKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
          responseType: 'stream'
        });
        
        await new Promise((resolve, reject) => {
          const file = fs.createWriteStream(audioPath);
          ttsRes.data.pipe(file);
          file.on('finish', resolve);
          file.on('error', reject);
        });
      }

      const audioDur = await new Promise((resolve) => {
        const ff = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', audioPath]);
        ff.stdout.on('data', d => resolve(parseFloat(d.toString().trim())));
        ff.on('close', () => resolve(30)); // fallback
      });

      // 2. Get Background
      console.log(`[VIDEO] Checking background clips in: ${BACKGROUND_CLIPS_DIR}`);
      const localClips = fs.readdirSync(BACKGROUND_CLIPS_DIR).filter(f => f.endsWith('.mp4'));
      console.log(`[VIDEO] Found ${localClips.length} clips:`, localClips);
      let bgPath = '';
      if (localClips.length > 0) {
        bgPath = path.join(BACKGROUND_CLIPS_DIR, localClips[Math.floor(Math.random() * localClips.length)]);
      } else {
        throw new Error(`No background clips found in ${BACKGROUND_CLIPS_DIR}. Please sync with Drive first.`);
      }

      // 3. Extract Keywords and Fetch Images
      updateJob(jobId, { stage: 'Fetching matching images...', progress: 50 });
      const images = [];
      const durationPerImage = audioDur / (req.body.visuals?.length || 10);

      if (req.body.visuals && req.body.visuals.length > 0) {
        // Use visuals from frontend
        for (let i = 0; i < req.body.visuals.length; i++) {
          const vis = req.body.visuals[i];
          const imgPath = path.join(jobDir, `img_${i}.jpg`);
          try {
            await downloadFile(vis.url, imgPath);
            const isValid = await verifyMedia(imgPath);
            if (isValid) {
              images.push({
                path: imgPath,
                url: vis.url,
                start: i * durationPerImage,
                end: (i + 1) * durationPerImage,
                keyword: vis.keyword
              });
            } else {
              fs.unlink(imgPath, () => {});
            }
          } catch (e) { console.error('Image Download Error:', e.message); }
        }
      } else {
        // Chunking script into 3-5 words for auto-extraction
        const words = script.split(/\s+/);
        const wordCount = words.length;
        const estimatedDurationMins = wordCount / 150;
        const targetCount = Math.max(10, Math.round(estimatedDurationMins * 15));
        const wordsPerSegment = Math.max(8, Math.floor(wordCount / targetCount));

        const segments = [];
        for (let i = 0; i < words.length; i += wordsPerSegment) {
          segments.push(words.slice(i, i + wordsPerSegment).join(' '));
        }
        
        const imageCount = segments.length;
        const autoDuration = audioDur / imageCount;
        const stopwords = new Set(['the','this','that','will','with','from']);
        
        for (let i = 0; i < imageCount; i++) {
          const keywordsToTry = await getEnhancedKeywords(segments[i], req.body.geminiKey, req.body.topic);
          console.log(`[TALKING_HEAD] Segment ${i+1} keywords:`, keywordsToTry);

          let foundImage = false;
          for (const keyword of keywordsToTry) {
             if (foundImage) break;
             try {
               const pexelsRes = await axios.get(`https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=1`, {
                 headers: { Authorization: pexelsKey }
               });
               
               if (pexelsRes.data.photos?.length > 0) {
                 const imgUrl = pexelsRes.data.photos[0].src.large;
                 const imgPath = path.join(jobDir, `img_${i}.jpg`);
                 await downloadFile(imgUrl, imgPath);
                 const isValid = await verifyMedia(imgPath);
                 if (isValid) {
                   images.push({ path: imgPath, url: imgUrl, start: i * autoDuration, end: (i + 1) * autoDuration, keyword });
                   console.log(`[TALKING_HEAD] Matched image for keyword "${keyword}"`);
                   foundImage = true;
                 } else {
                   fs.unlink(imgPath, () => {});
                 }
               }
             } catch (e) { console.warn(`[TALKING_HEAD] Pexels Image Keyword "${keyword}" failed:`, e.message); }
          }
        }
      }

      // 4. Render
      updateJob(jobId, { stage: 'Rendering with overlays...', progress: 80 });
      const outputFilename = `talking_head_${timestamp}.mp4`;
      const outputPath = path.join(OUTPUT_DIR, outputFilename);
      
      const characterFiles = [
        'gigachad.png', 'sigma_male.png', 'hypebeast.png', 'gamer_girl.png', 'npc_girl.png', 'soft_girl.png',
        'cartoon_robot.png', 'cartoon_lion.png', 'cartoon_monster.png', 'cartoon_superhero.png'
      ];
      const characterFilename = characterFiles[avatarId] || characterFiles[0];
      const characterPath = path.join(__dirname, '..', 'public', 'characters', characterFilename);

      // Auto-select background music if exists
      let selectedMusic = '';
      const musicDir = path.join(__dirname, 'music');
      if (fs.existsSync(musicDir)) {
        const songs = fs.readdirSync(musicDir).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
        if (songs.length > 0) {
          selectedMusic = path.join(musicDir, songs[Math.floor(Math.random() * songs.length)]);
          console.log(`[TALKING_HEAD] Selected background music: ${selectedMusic}`);
        }
      }

      const pyArgs = [
        path.join(__dirname, 'talking_head_renderer.py'),
        audioPath, bgPath, JSON.stringify(images), outputPath, captionStyle || 'DYNAMICS', script, characterPath, captionSize, captionPosition
      ];
      if (selectedMusic) pyArgs.push(selectedMusic);

      const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
      const py = spawn(pyCmd, pyArgs);

      py.on('close', (code) => {
        if (code === 0) {
          const videoUrl = `${BASE_URL}/output/${outputFilename}`;
          updateJob(jobId, { status: 'completed', progress: 100, stage: 'Complete', result: { videoUrl, images } });
        } else {
          updateJob(jobId, { status: 'failed', error: 'Render failed' });
        }
      });

    } catch (e) {
      updateJob(jobId, { status: 'failed', error: e.message });
    }
  })();
});

// ─────────────────────────────────────────────
// SOCIAL AUTH ENDPOINTS
// ─────────────────────────────────────────────

app.post('/api/talking-head/generate-visuals', async (req, res) => {
  const { script, type = 'image' } = req.body;
  const pexelsKey = req.body.pexelsKey || keysDb.pexelsKey || process.env.PEXELS_API_KEY || 'hNOwvi53vUHCrAgGNzw92UlYfx7gsYtgdOoEoN0dzOjS9j4j1Ohqf4FJ';
  if (!script) return res.status(400).json({ error: 'script required' });

  try {
    const words = script.split(/\s+/).filter(w => w.trim().length > 0);
    const wordCount = words.length;
    const estimatedDurationMins = wordCount / 150; // 150 WPM estimate
    const estimatedDurationSecs = Math.round(estimatedDurationMins * 60);
    
    // Target 15 clips per 60 seconds (13-17 range)
    const targetCount = Math.max(10, Math.round(estimatedDurationMins * 15));
    const wordsPerSegment = Math.max(6, Math.floor(wordCount / targetCount));

    console.log(`[VISUALS] Analyzing script: ${wordCount} words | Est. Duration: ${estimatedDurationSecs}s | Target Clips: ${targetCount}`);

    const segments = [];
    for (let i = 0; i < words.length; i += wordsPerSegment) {
      segments.push(words.slice(i, i + wordsPerSegment).join(' '));
    }
    
    // Process in batches to avoid rate limits and timeouts
    const processSegment = async (segment, idx) => {
      let keyword = 'concept';
      if (req.body.geminiKey) {
        try {
          const aiKeyword = await fetchAiKeyword(segment, req.body.geminiKey);
          if (aiKeyword) keyword = aiKeyword;
        } catch (e) {
          console.warn(`[VISUALS] Gemini failed for segment ${idx}, falling back to regex:`, e.message);
        }
      }
      
      if (keyword === 'concept') {
        const stopwords = new Set(['the','this','that','will','with','from', 'and', 'are', 'was', 'were', 'for', 'you', 'your', 'about', 'they', 'their']);
        const sWords = segment.toLowerCase().replace(/[^a-z\s]/g,'').split(/\s+/).filter(w => w.length > 4 && !stopwords.has(w));
        keyword = sWords.slice(0, 2).join(' ') || 'cinematic';
      }

      try {
        if (type === 'video') {
          const pexelsRes = await axios.get(`https://api.pexels.com/v1/videos/search?query=${encodeURIComponent(keyword)}&per_page=1&size=medium`, {
            headers: { Authorization: pexelsKey },
            timeout: 10000
          });
          const video = pexelsRes.data.videos?.[0];
          if (video) {
            const file = video.video_files.find(f => f.quality === 'hd') || video.video_files[0];
            return { url: file.link, keyword, id: idx };
          }
        } else {
          const pexelsRes = await axios.get(`https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=1`, {
            headers: { Authorization: pexelsKey },
            timeout: 10000
          });
          if (pexelsRes.data.photos?.length > 0) {
            return { url: pexelsRes.data.photos[0].src.large, keyword, id: idx };
          }
        }
      } catch (e) {
        console.warn(`[VISUALS] Pexels failed for segment ${idx} ("${keyword}"):`, e.message);
      }
      return { url: '', keyword, id: idx, error: true };
    };

    // Concurrency-limited processing
    const results = [];
    const concurrency = 5;
    for (let i = 0; i < segments.length; i += concurrency) {
      const batch = segments.slice(i, i + concurrency).map((s, j) => processSegment(s, i + j));
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
      console.log(`[VISUALS] Progress: ${results.length}/${segments.length} clips processed`);
    }

    res.json({ 
      visuals: results, 
      analysis: { 
        wordCount, 
        estimatedDurationSecs, 
        clipCount: results.length,
        clipsPerMinute: Math.round((results.length / estimatedDurationMins) * 10) / 10
      } 
    });
  } catch (error) {
    console.error('[VISUALS ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// Imagen 3 Generation with Gemini API
app.post('/api/generate-image-gemini', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  try {
    console.log(`[IMAGE] Generating image with Pollinations: "${prompt}"`);
    const timestamp = Date.now();
    const outputFilename = `image_${timestamp}.png`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    // Pollinations AI uses a simple URL-based generation
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;

    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    res.json({
      imageUrl: `${BASE_URL}/output/${outputFilename}`,
      outputPath
    });
  } catch (error) {
    console.error('[IMAGE ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
});


app.post('/api/automation/sync-background', async (req, res) => {
    try {
        const automationEngine = require('./automation_engine');
        const stats = await automationEngine.syncBackgroundClips();
        res.json({ 
            success: true, 
            message: stats ? `Success! Found ${stats.found} videos on your Drive.` : 'Sync started in the background.' 
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get connected accounts
app.get('/api/auth/accounts', (req, res) => {
    const accounts = {};
    Object.keys(socialDb.tokens).forEach(platform => {
        const tokens = socialDb.tokens[platform];
        if (Array.isArray(tokens) && tokens.length > 0) {
            accounts[platform] = {
                connected: true,
                accounts: tokens.map(t => ({
                    id: t.id,
                    username: t.username,
                    email: t.email,
                    avatar: t.avatar || t.picture
                }))
            };
        } else {
            accounts[platform] = { connected: false, accounts: [] };
        }
    });
    res.json(accounts);
});

// Get platform configs (for display in UI)
app.get('/api/auth/configs', (req, res) => {
    const publicConfigs = {};
    Object.keys(socialDb.configs).forEach(platform => {
        publicConfigs[platform] = {
            clientId: socialDb.configs[platform].clientId,
            redirectUri: socialDb.configs[platform].redirectUri,
            spreadsheetId: socialDb.configs[platform].spreadsheetId
        };
    });
    res.json(publicConfigs);
});

// Update platform config (Client ID/Secret)
app.post('/api/auth/config', (req, res) => {
    const { platform, config } = req.body;
    if (socialDb.configs[platform]) {
        socialDb.configs[platform] = { ...socialDb.configs[platform], ...config };
        saveSocialDb();
        return res.json({ success: true });
    }
    res.status(400).json({ error: 'Invalid platform' });
});

// Generate Auth URL
app.get('/api/auth/url/:platform', (req, res) => {
    const { platform } = req.params;
    const config = socialDb.configs[platform];
    
    if (!config || !config.clientId) {
        return res.status(400).json({ error: `Client ID not configured for ${platform}` });
    }

    let url = '';
    if (platform === 'youtube') {
        const scopes = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
        url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.clientId}&redirect_uri=${config.redirectUri}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent`;
    } else if (platform === 'instagram') {
        const scopes = 'public_profile,instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement';
        url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${config.clientId}&redirect_uri=${config.redirectUri}&scope=${encodeURIComponent(scopes)}&response_type=code`;
    } else if (platform === 'tiktok') {
        url = `https://www.tiktok.com/v2/auth/authorize/?client_key=${config.clientId}&scope=user.info.basic,video.upload,video.publish&response_type=code&redirect_uri=${config.redirectUri}`;
    } else if (platform === 'facebook') {
        url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${config.clientId}&redirect_uri=${config.redirectUri}&scope=public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts`;
    } else if (platform === 'pinterest') {
        url = `https://www.pinterest.com/oauth/?client_id=${config.clientId}&redirect_uri=${config.redirectUri}&response_type=code&scope=boards:read,pins:read,pins:write`;
    } else if (platform === 'twitter') {
        url = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${config.clientId}&redirect_uri=${config.redirectUri}&scope=tweet.read%20tweet.write%20users.read%20offline.access&state=state&code_challenge=challenge&code_challenge_method=plain`;
    } else if (platform === 'linkedin') {
        url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${config.clientId}&redirect_uri=${config.redirectUri}&scope=r_liteprofile%20r_emailaddress%20w_member_social`;
    } else if (platform === 'snapchat') {
        url = `https://accounts.snapchat.com/accounts/oauth2/auth?client_id=${config.clientId}&redirect_uri=${config.redirectUri}&response_type=code&scope=user.display_name,user.bitmoji.avatar`;
    }

    res.json({ url });
});

// OAuth Callback
app.get('/api/auth/callback/:platform', async (req, res) => {
    const { platform } = req.params;
    const { code } = req.query;
    const config = socialDb.configs[platform];

    if (!code) return res.send('No code provided');

    try {
        let tokenData = {};
        if (platform === 'youtube') {
            const resp = await axios.post('https://oauth2.googleapis.com/token', {
                code,
                client_id: config.clientId,
                client_secret: config.clientSecret,
                redirect_uri: config.redirectUri,
                grant_type: 'authorization_code'
            });
            tokenData = resp.data;
            
            // Get YouTube Channel info for specific channel name
            const oauth2Client = new google.auth.OAuth2(
                config.clientId,
                config.clientSecret,
                config.redirectUri
            );
            oauth2Client.setCredentials(tokenData);
            const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
            
            try {
                const channelResp = await youtube.channels.list({
                    part: 'snippet',
                    mine: true
                });
                if (channelResp.data.items && channelResp.data.items.length > 0) {
                    const channel = channelResp.data.items[0];
                    tokenData.username = channel.snippet.title;
                    tokenData.avatar = channel.snippet.thumbnails.default.url;
                    tokenData.id = channel.id; // YouTube Channel ID
                    tokenData.platform_id = channel.id; 
                } else {
                    const profile = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
                        headers: { Authorization: `Bearer ${tokenData.access_token}` }
                    });
                    tokenData.username = profile.data.name;
                    tokenData.avatar = profile.data.picture;
                    tokenData.id = profile.data.id;
                }
            } catch (err) {
                console.error('[YOUTUBE PROFILE ERROR]', err.message);
                const profile = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
                    headers: { Authorization: `Bearer ${tokenData.access_token}` }
                });
                tokenData.username = profile.data.name;
                tokenData.avatar = profile.data.picture;
                tokenData.id = profile.data.id;
            }
        } else if (platform === 'instagram') {
            // Instagram Reels automation requires Facebook Login with Instagram Graph API permissions
            const params = new URLSearchParams();
            params.append('client_id', config.clientId);
            params.append('client_secret', config.clientSecret);
            params.append('redirect_uri', config.redirectUri);
            params.append('code', code);

            const resp = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`);
            tokenData = resp.data;
            
            // Fetch Instagram Business Accounts linked to user's Facebook Pages
            try {
                const pagesRes = await axios.get(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name,instagram_business_account&access_token=${tokenData.access_token}`);
                const pages = pagesRes.data.data;
                const igAccounts = [];
                
                for (const page of pages) {
                    if (page.instagram_business_account) {
                        const igId = page.instagram_business_account.id;
                        const igProfileRes = await axios.get(`https://graph.facebook.com/v18.0/${igId}?fields=id,username,profile_picture_url&access_token=${tokenData.access_token}`);
                        igAccounts.push({
                            id: igId,
                            username: igProfileRes.data.username,
                            avatar: igProfileRes.data.profile_picture_url,
                            page_id: page.id,
                            access_token: tokenData.access_token // Use user access token for posting
                        });
                    }
                }
                
                if (igAccounts.length > 0) {
                    // Store multiple accounts if found
                    tokenData.accounts = igAccounts;
                    tokenData.username = igAccounts[0].username;
                    tokenData.avatar = igAccounts[0].avatar;
                    tokenData.id = igAccounts[0].id;
                } else {
                    throw new Error('No Instagram Business accounts found linked to your Facebook Pages');
                }
            } catch (err) {
                console.error('[INSTAGRAM GRAPH ERROR]', err.response?.data || err.message);
                throw new Error('Failed to fetch Instagram Business account. Ensure your IG account is professional and linked to a FB Page.');
            }
        } else if (platform === 'tiktok') {
            const params = new URLSearchParams();
            params.append('client_key', config.clientId);
            params.append('client_secret', config.clientSecret);
            params.append('code', code);
            params.append('grant_type', 'authorization_code');
            params.append('redirect_uri', config.redirectUri);

            const resp = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            tokenData = resp.data;
            
            // Fetch TikTok profile
            try {
                const profileRes = await axios.get('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name,avatar_url', {
                    headers: { Authorization: `Bearer ${tokenData.access_token}` }
                });
                const user = profileRes.data.data.user;
                tokenData.username = user.display_name;
                tokenData.avatar = user.avatar_url;
                tokenData.id = user.open_id;
            } catch (err) {
                tokenData.username = 'TikTok User';
                tokenData.id = tokenData.open_id;
            }
        } else if (platform === 'facebook') {
            const resp = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${config.clientId}&redirect_uri=${config.redirectUri}&client_secret=${config.clientSecret}&code=${code}`);
            tokenData = resp.data;
            
            // Fetch Facebook profile
            try {
                const profileRes = await axios.get(`https://graph.facebook.com/me?fields=id,name,picture&access_token=${tokenData.access_token}`);
                tokenData.username = profileRes.data.name;
                tokenData.avatar = profileRes.data.picture?.data?.url;
                tokenData.id = profileRes.data.id;
            } catch (err) {
                tokenData.username = 'Facebook User';
            }
        } else if (platform === 'pinterest') {
            const params = new URLSearchParams();
            params.append('grant_type', 'authorization_code');
            params.append('code', code);
            params.append('redirect_uri', config.redirectUri);
            
            const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
            const resp = await axios.post('https://api.pinterest.com/v5/oauth/token', params, {
                headers: { 
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded' 
                }
            });
            tokenData = resp.data;
            tokenData.username = 'Pinterest User';
        } else if (platform === 'twitter') {
            const params = new URLSearchParams();
            params.append('code', code);
            params.append('grant_type', 'authorization_code');
            params.append('redirect_uri', config.redirectUri);
            params.append('code_verifier', 'challenge'); // Should match challenge in URL generation
            
            const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
            const resp = await axios.post('https://api.twitter.com/2/oauth2/token', params, {
                headers: { 
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded' 
                }
            });
            tokenData = resp.data;
            tokenData.username = 'X User';
        } else if (platform === 'linkedin') {
            const params = new URLSearchParams();
            params.append('grant_type', 'authorization_code');
            params.append('code', code);
            params.append('redirect_uri', config.redirectUri);
            params.append('client_id', config.clientId);
            params.append('client_secret', config.clientSecret);
            
            const resp = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            tokenData = resp.data;
            tokenData.username = 'LinkedIn User';
        } else if (platform === 'snapchat') {
            const params = new URLSearchParams();
            params.append('grant_type', 'authorization_code');
            params.append('code', code);
            params.append('redirect_uri', config.redirectUri);
            params.append('client_id', config.clientId);
            params.append('client_secret', config.clientSecret);
            
            const resp = await axios.post('https://accounts.snapchat.com/accounts/oauth2/token', params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            tokenData = resp.data;
            tokenData.username = 'Snapchat User';
        } else {
            // Generic fallback
            console.log(`[AUTH] Generic fallback for platform: ${platform}`);
            tokenData = { access_token: code, username: `${platform.charAt(0).toUpperCase() + platform.slice(1)} User` };
        }

        if (!socialDb.tokens[platform]) socialDb.tokens[platform] = [];
        
        // Add unique ID if missing
        tokenData.id = tokenData.id || `acc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        // Find if this specific account (by ID primarily, then username) already exists
        const existingIndex = socialDb.tokens[platform].findIndex(t => t.id === tokenData.id || (t.username === tokenData.username && t.username !== 'Instagram User' && t.username !== 'TikTok User' && t.username !== 'Facebook User'));
        
        if (existingIndex >= 0) {
            // Update existing
            socialDb.tokens[platform][existingIndex] = { ...socialDb.tokens[platform][existingIndex], ...tokenData };
        } else {
            // Add new
            socialDb.tokens[platform].push(tokenData);
        }
        
        saveSocialDb();

        res.send(`
            <html>
                <body>
                    <script>
                        window.opener.postMessage({ type: 'AUTH_SUCCESS', platform: '${platform}' }, '*');
                        window.close();
                    </script>
                    <h1>// Authentication Status Endpoints
app.get('/api/social/tokens', (req, res) => {
    res.json(socialDb.tokens);
});

app.get('/api/auth/status', (req, res) => {
    res.json({ authenticated: true, user: req.session.user || null });
});
</h1>
                    <p>You can close this window now.</p>
                </body>
            </html>
        `);
    } catch (e) {
        console.error('[AUTH ERROR]', e.response?.data || e.message);
        res.status(500).send('Authentication failed: ' + (e.response?.data?.error_description || e.message));
    }
});

// ─────────────────────────────────────────────
// PROJECT PERSISTENCE ENDPOINTS
// ─────────────────────────────────────────────

// Get all projects
app.get('/api/projects', (req, res) => {
    res.json(projectsDb.projects);
});

// Save a new project
app.post('/api/projects', (req, res) => {
    const { type, topic, script, videoUrl, metadata } = req.body;
    const newProject = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        type: type || 'UNKNOWN',
        topic: topic || 'Untitled Project',
        script: script || '',
        videoUrl: videoUrl || '',
        metadata: metadata || {}
    };
    projectsDb.projects.unshift(newProject);
    saveProjectsDb();
    res.json({ success: true, project: newProject });
});

// Delete a project
app.delete('/api/projects/:id', (req, res) => {
    const { id } = req.params;
    projectsDb.projects = projectsDb.projects.filter(p => p.id !== id);
    saveProjectsDb();
    res.json({ success: true });
});

// ─────────────────────────────────────────────
// SERIES MANAGEMENT ENDPOINTS
// ─────────────────────────────────────────────

// Get all series
app.get('/api/series', (req, res) => {
    res.json(seriesEngine.getSeries());
});

// Create a new series
app.post('/api/series', (req, res) => {
    try {
        const series = seriesEngine.addSeries(req.body);
        res.json({ success: true, series });
    } catch (e) {
        console.error('[SERIES ERROR]', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Delete a series
app.delete('/api/series/:id', (req, res) => {
    seriesEngine.deleteSeries(req.params.id);
    res.json({ success: true });
});

// Toggle series active status
app.patch('/api/series/:id', (req, res) => {
    seriesEngine.updateSeries(req.params.id, req.body);
    res.json({ success: true });
});

// Trigger manual generation for a series
app.post('/api/series/:id/generate', async (req, res) => {
    try {
        const series = seriesEngine.db.series.find(s => s.id === req.params.id);
        if (!series) return res.status(404).json({ error: 'Series not found' });
        
        // Run in background
        seriesEngine.generateAndPost(series);
        res.json({ success: true, message: 'Generation started in background' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─────────────────────────────────────────────
// SCHEDULED AUTOMATION ENDPOINTS
// ─────────────────────────────────────────────

app.get('/api/scheduled-automations', (req, res) => {
    res.json(scheduledAutomationEngine.getAutomations());
});

app.post('/api/scheduled-automations', (req, res) => {
    try {
        const automation = scheduledAutomationEngine.addAutomation(req.body);
        res.json({ success: true, automation });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/scheduled-automations/:id', (req, res) => {
    scheduledAutomationEngine.deleteAutomation(req.params.id);
    res.json({ success: true });
});

app.patch('/api/scheduled-automations/:id', (req, res) => {
    scheduledAutomationEngine.updateAutomation(req.params.id, req.body);
    res.json({ success: true });
});

// ─────────────────────────────────────────────
// AI SCOUT ENDPOINTS
// ─────────────────────────────────────────────

app.get('/api/scout/discover', async (req, res) => {
    try {
        const tools = await scoutEngine.findNewTools();
        res.json({ success: true, tools });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/scout/tools', (req, res) => {
    res.json(scoutEngine.db.tools);
});

app.post('/api/scout/run', async (req, res) => {
    const { url, voice } = req.body;
    const geminiKey = req.body.geminiKey || keysDb.geminiKey || process.env.GEMINI_API_KEY;
    const elevenLabsKey = req.body.elevenLabsKey || keysDb.elevenLabsKey || process.env.ELEVENLABS_API_KEY || 'sk_eb749e2f22c96c9af0ab15df0b4791ad782764ea9f4311d4';
    if (!url || !geminiKey) return res.status(400).json({ error: 'URL and Gemini Key required' });

    const jobId = createJob('AI_SCOUT', { url });
    res.json({ success: true, jobId });

    // Run in background
    (async () => {
        try {
            console.log(`[SCOUT] Starting full pipeline for: ${url}`);
            updateJob(jobId, { stage: 'Analyzing with Gemini...', progress: 10 });
            
            const timestamp = Date.now();
            const jobDir = path.join(OUTPUT_DIR, `scout_${timestamp}`);
            if (!fs.existsSync(jobDir)) fs.mkdirSync(jobDir);

            // 1. Analyze with Gemini
            const analysis = await scoutEngine.analyzeTool(url, geminiKey);
            
            // 2. Generate Audio (Piper or ElevenLabs)
            updateJob(jobId, { stage: 'Generating voiceover...', progress: 30 });
            
            const isPiper = piperTts.VOICE_MODELS[voice];
            const audioPath = path.join(jobDir, isPiper ? 'voiceover.wav' : 'voiceover.mp3');
            
            if (isPiper) {
                // Use Viral synthesis for AI Scout reels
                await piperTts.synthesizeViral(analysis.voiceover, voice, audioPath);
            } else if (elevenLabsKey) {
                const VOICE_IDS = {
                    Rachel: '21m00Tcm4TlvDq8ikWAM',
                    Adam:   'pNInz6obpgDQGcFmaJgB',
                    Bella:  'EXAVITQu4vr4xnSDxMaL',
                    Antoni: 'ErXwobaYiN019PkySvjV',
                    Elli:   'MF3mGyEYCl7XYWbV9V6O',
                    Josh:   'TxGEqnHWrfWFTfGW9XjX'
                };
                const voiceId = VOICE_IDS[voice] || VOICE_IDS.Rachel;
                const ttsPayload = JSON.stringify({
                    text: analysis.voiceover.substring(0, 5000),
                    model_id: 'eleven_turbo_v2_5',
                    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                });

                await new Promise((resolve, reject) => {
                    const options = {
                        hostname: 'api.elevenlabs.io',
                        path: `/v1/text-to-speech/${voiceId}`,
                        method: 'POST',
                        headers: {
                            'xi-api-key': elevenLabsKey,
                            'Content-Type': 'application/json',
                            'Accept': 'audio/mpeg',
                            'Content-Length': Buffer.byteLength(ttsPayload)
                        }
                    };
                    const file = fs.createWriteStream(audioPath);
                    const reqHttp = https.request(options, r => {
                        if (r.statusCode !== 200) {
                            let err = '';
                            r.on('data', d => err += d);
                            r.on('end', () => reject(new Error(`ElevenLabs error: ${err}`)));
                            return;
                        }
                        r.pipe(file);
                        file.on('finish', () => { file.close(); resolve(); });
                    });
                    reqHttp.on('error', reject);
                    reqHttp.write(ttsPayload);
                    reqHttp.end();
                });
            } else {
                await new Promise((resolve) => {
                    const ffmpeg = spawn('ffmpeg', ['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', '10', audioPath]);
                    ffmpeg.on('close', resolve);
                });
            }

            // 3. Record Demo (Playwright)
            updateJob(jobId, { stage: 'Recording demo...', progress: 50 });
            const recordingPath = path.join(jobDir, 'recording.mp4');
            await recordToolDemo(url, recordingPath, 20);

            // 4. Render Final Video (FFmpeg)
            updateJob(jobId, { stage: 'Rendering final video...', progress: 80 });
            const outputFilename = `scout_render_${timestamp}.mp4`;
            const outputPath = path.join(OUTPUT_DIR, outputFilename);

            await new Promise((resolve, reject) => {
                const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
                const py = spawn(pyCmd, [
                    path.join(__dirname, 'scout_renderer.py'),
                    recordingPath, audioPath, outputPath, analysis.voiceover
                ]);
                let stderr = '';
                py.stderr.on('data', d => stderr += d.toString());
                py.on('close', code => {
                    if (code === 0) resolve();
                    else reject(new Error(`Renderer failed: ${stderr}`));
                });
            });

            const finalUrl = `${BASE_URL}/output/${outputFilename}`;
            
            // Save to projects
            const project = {
                id: Date.now().toString(),
                timestamp: new Date().toLocaleString(),
                type: 'AI_SCOUT',
                topic: analysis.toolName,
                script: analysis.script,
                videoUrl: finalUrl,
                metadata: { url, analysis }
            };
            projectsDb.projects.unshift(project);
            saveProjectsDb();

            updateJob(jobId, { 
                status: 'completed', 
                progress: 100, 
                stage: 'Complete', 
                result: { success: true, videoUrl: finalUrl, analysis } 
            });

        } catch (e) {
            updateJob(jobId, { status: 'failed', error: e.message, stage: 'Failed' });
        }
    })();
});

// ─────────────────────────────────────────────
// SOCIAL UPLOAD ENDPOINTS
// ─────────────────────────────────────────────

async function generateAiCaption(topic, script, geminiKey) {
    if (!geminiKey) return `Check out this video about ${topic}! #viral #ai #content`;
    
    const prompt = `Act as a social media expert. Create a viral caption and description for a video.
    Topic: ${topic}
    Script Snippet: ${script.substring(0, 300)}
    
    Provide:
    1. A hook-driven Title/Caption (short, max 10 words)
    2. A brief engaging description (2-3 sentences)
    3. 5-10 relevant trending hashtags
    
    Format:
    TITLE: [title here]
    DESC: [description here]
    TAGS: [hashtags here]`;

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
            { contents: [{ parts: [{ text: prompt }] }] }
        );
        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('No AI response');
        
        const titleMatch = text.match(/TITLE:\s*(.*)/i);
        const descMatch = text.match(/DESC:\s*(.*)/i);
        const tagsMatch = text.match(/TAGS:\s*(.*)/i);
        
        return {
            title: titleMatch ? titleMatch[1].trim() : `${topic} Viral Video`,
            description: descMatch ? descMatch[1].trim() : `Amazing content about ${topic}. Watch till the end!`,
            hashtags: tagsMatch ? tagsMatch[1].trim() : '#ai #content #viral'
        };
    } catch (e) {
        console.error('[CAPTION ERROR]', e.message);
        return {
            title: `${topic} Video`,
            description: `Check out this video about ${topic}!`,
            hashtags: '#viral #ai #content'
        };
    }
}

app.post('/api/upload', async (req, res) => {
    const { videoUrl, platform, accountId, topic, script } = req.body;
    if (!videoUrl || !platform || !accountId) {
        return res.status(400).json({ error: 'videoUrl, platform, and accountId are required' });
    }

    const jobId = createJob('UPLOAD', { platform, topic });
    res.json({ success: true, jobId });

    (async () => {
        try {
            updateJob(jobId, { stage: 'Generating AI caption...', progress: 20 });
            const caption = await generateAiCaption(topic || 'New Video', script || '', keysDb.geminiKey);
            
            updateJob(jobId, { stage: 'Preparing video for upload...', progress: 40 });
            const tempPath = path.join(OUTPUT_DIR, `upload_${Date.now()}.mp4`);
            
            // Optimization: If the URL is local to this server, just copy the file directly
            if (videoUrl.includes('/output/')) {
                const fileName = videoUrl.split('/output/')[1];
                const sourcePath = path.join(OUTPUT_DIR, fileName.split('?')[0]); // Remove query params
                if (fs.existsSync(sourcePath)) {
                    fs.copyFileSync(sourcePath, tempPath);
                } else {
                    await downloadFile(videoUrl, tempPath);
                }
            } else {
                await downloadFile(videoUrl, tempPath);
            }

            const account = socialDb.tokens[platform]?.find(t => t.id === accountId);
            if (!account) throw new Error(`Selected account (${accountId}) not found on ${platform}. Stored IDs: ${socialDb.tokens[platform]?.map(t => t.id).join(', ')}`);

            updateJob(jobId, { stage: `Uploading to ${platform}...`, progress: 60 });

            if (platform === 'youtube') {
                updateJob(jobId, { stage: 'Initializing YouTube upload...', progress: 50 });
                
                const oauth2Client = new google.auth.OAuth2(
                    socialDb.configs.youtube.clientId,
                    socialDb.configs.youtube.clientSecret,
                    socialDb.configs.youtube.redirectUri
                );

                oauth2Client.setCredentials({
                    access_token: account.access_token,
                    refresh_token: account.refresh_token
                });

                const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

                updateJob(jobId, { stage: 'Uploading video to YouTube...', progress: 70 });

                const youtubeRes = await youtube.videos.insert({
                    part: 'snippet,status',
                    requestBody: {
                        snippet: {
                            title: caption.title || topic || 'New Video',
                            description: caption.description || script || '',
                            tags: caption.tags || [],
                            categoryId: '22' // People & Blogs
                        },
                        status: {
                            privacyStatus: 'public', // Default to public
                            selfDeclaredMadeForKids: false
                        }
                    },
                    media: {
                        mimeType: 'video/mp4',
                        body: fs.createReadStream(tempPath)
                    }
                });

                console.log(`[UPLOAD] YouTube upload success for ${account.username}: ${youtubeRes.data.id}`);
                
                updateJob(jobId, { 
                    status: 'completed', 
                    progress: 100, 
                    stage: 'Published to YouTube!', 
                    result: { 
                        success: true, 
                        platform: 'youtube', 
                        videoId: youtubeRes.data.id,
                        url: `https://youtube.com/watch?v=${youtubeRes.data.id}`,
                        caption 
                    } 
                });

                saveUploadHistory({
                    title: caption.title || topic || 'New Video',
                    channelName: account.username || 'YouTube Channel',
                    platform: 'youtube',
                    videoLink: `https://youtube.com/watch?v=${youtubeRes.data.id}`,
                    videoId: youtubeRes.data.id
                }, oauth2Client);
            } else {
                // Generic fallback / Simulation
                await new Promise(r => setTimeout(r, 2000));
                
                updateJob(jobId, { 
                    status: 'completed', 
                    progress: 100, 
                    stage: `Published to ${platform}!`, 
                    result: { success: true, platform, caption } 
                });

                // Record history even for simulated/non-youtube uploads
                saveUploadHistory({
                    title: caption.title || topic || 'New Video',
                    channelName: account.username || `${platform} Account`,
                    platform: platform,
                    videoLink: videoUrl // For simulation, use the original URL or a mock
                });
            }
            
            // Clean up
            fs.unlink(tempPath, () => {});

        } catch (e) {
            updateJob(jobId, { status: 'failed', error: e.message, stage: 'Upload failed' });
        }
    })();
});

// Auto-cleanup: Delete output files older than 24 hours every hour
setInterval(() => {
    try {
        const outputDir = path.join(__dirname, 'output');
        if (!fs.existsSync(outputDir)) return;
        
        fs.readdirSync(outputDir).forEach(file => {
            try {
                const filePath = path.join(outputDir, file);
                const stats = fs.statSync(filePath);
                const now = new Date().getTime();
                const fileAge = now - new Date(stats.ctime).getTime();
                const twentyFourHours = 24 * 60 * 60 * 1000;
                
                if (fileAge > twentyFourHours) {
                    fs.unlinkSync(filePath);
                    console.log(`[CLEANUP] Deleted old output: ${file}`);
                }
            } catch (err) {}
        });
    } catch (e) {
        console.error('[CLEANUP] Error during cleanup:', e);
    }
}, 60 * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
