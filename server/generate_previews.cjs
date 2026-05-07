const { synthesize } = require('./piper_tts');
const path = require('path');
const fs = require('fs');

const PUBLIC_VOICES_DIR = path.join(__dirname, '..', 'public', 'voices');
if (!fs.existsSync(PUBLIC_VOICES_DIR)) fs.mkdirSync(PUBLIC_VOICES_DIR, { recursive: true });

const PREVIEW_TEXT = "Hello! This is a preview of my voice in Auto Vid. I hope you like it!";

const voices = [
    { id: 'Natural-Guy', file: 'edge_guy.mp3' },
    { id: 'Natural-Jenny', file: 'edge_jenny.mp3' },
    { id: 'Natural-Aria', file: 'edge_aria.mp3' },
    { id: 'Natural-Sonia', file: 'edge_sonia.mp3' },
    { id: 'Natural-News', file: 'edge_news.mp3' },
    { id: 'Expressive-Sarah', file: 'kokoro_sarah.mp3' },
    { id: 'Expressive-Adam', file: 'kokoro_adam.mp3' },
    { id: 'Expressive-Bella', file: 'kokoro_bella.mp3' },
    { id: 'Expressive-Nicole', file: 'kokoro_nicole.mp3' },
    { id: 'Expressive-Michael', file: 'kokoro_michael.mp3' },
    { id: 'US-Female-Viral', file: 'piper_female.mp3' },
    { id: 'US-Male-Story', file: 'piper_male.mp3' },
    { id: 'British-Premium', file: 'piper_british.mp3' },
    { id: 'Indian-English', file: 'piper_indian.mp3' }
];

async function run() {
    console.log("Generating previews...");
    for (const voice of voices) {
        const outPath = path.join(PUBLIC_VOICES_DIR, voice.file);
        const wavPath = outPath.replace('.mp3', '.wav');
        
        if (fs.existsSync(outPath)) {
            console.log(`Skipping ${voice.id}, already exists.`);
            continue;
        }

        try {
            console.log(`Generating for ${voice.id}...`);
            await synthesize(PREVIEW_TEXT, voice.id, wavPath, { skipEnhance: true });
            
            // Convert wav to mp3 using ffmpeg
            const { spawnSync } = require('child_process');
            spawnSync('ffmpeg', ['-y', '-i', wavPath, outPath]);
            
            if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
            console.log(`Done for ${voice.id}.`);
        } catch (e) {
            console.error(`Failed for ${voice.id}:`, e.message);
        }
    }
    console.log("All previews generated!");
}

run();
