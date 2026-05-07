const piperTts = require('./piper_tts');
const path = require('path');
const fs = require('fs');

const VOICES_DIR = path.join(__dirname, '..', 'public', 'voices');
if (!fs.existsSync(VOICES_DIR)) fs.mkdirSync(VOICES_DIR, { recursive: true });

const PREVIEW_TEXT = "Hello! I am one of the new high-quality voices available for your videos. I hope you like how I sound!";

const voicesToGenerate = [
    { id: 'Natural-Guy', name: 'edge_guy.mp3' },
    { id: 'Natural-Jenny', name: 'edge_jenny.mp3' },
    { id: 'Natural-Aria', name: 'edge_aria.mp3' },
    { id: 'Natural-Sonia', name: 'edge_sonia.mp3' },
    { id: 'Natural-News', name: 'edge_news.mp3' },
    // KOKORO VOICES
    { id: 'Expressive-Sarah', name: 'kokoro_sarah.mp3' },
    { id: 'Expressive-Adam', name: 'kokoro_adam.mp3' },
    { id: 'Expressive-Bella', name: 'kokoro_bella.mp3' },
    { id: 'Expressive-Nicole', name: 'kokoro_nicole.mp3' },
    { id: 'Expressive-Michael', name: 'kokoro_michael.mp3' }
];

async function generate() {
    for (const v of voicesToGenerate) {
        const out = path.join(VOICES_DIR, v.name);
        if (fs.existsSync(out)) {
            console.log(`Skipping ${v.name}, already exists.`);
            continue;
        }
        console.log(`Generating preview for ${v.id}...`);
        try {
            await piperTts.synthesize(PREVIEW_TEXT, v.id, out);
            console.log(`Done: ${v.name}`);
        } catch (e) {
            console.error(`Failed ${v.id}:`, e.message);
        }
    }
}

generate();
