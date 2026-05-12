const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PIPER_DIR = path.join(__dirname, 'piper');
const PIPER_EXE = path.join(PIPER_DIR, 'piper.exe');
const MODELS_DIR = path.join(PIPER_DIR, 'models');

if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true });

const VOICE_MODELS = {
    // PIPER VOICES (Legacy/Local)
    'US-Female-Viral': {
        engine: 'piper',
        model: 'en_US-lessac-high.onnx',
        config: 'en_US-lessac-high.onnx.json',
        settings: { noise_scale: 0.667, noise_w: 0.8, length_scale: 1.0 }
    },
    'US-Male-Story': {
        engine: 'piper',
        model: 'en_US-ryan-high.onnx',
        config: 'en_US-ryan-high.onnx.json',
        settings: { noise_scale: 0.667, noise_w: 0.8, length_scale: 1.05 }
    },
    'British-Premium': {
        engine: 'piper',
        model: 'en_GB-alba-medium.onnx',
        config: 'en_GB-alba-medium.onnx.json',
        settings: { noise_scale: 0.667, noise_w: 0.8, length_scale: 1.0 }
    },
    'Indian-English': {
        engine: 'piper',
        model: 'en_US-kusal-medium.onnx',
        config: 'en_US-kusal-medium.onnx.json',
        settings: { noise_scale: 0.667, noise_w: 0.8, length_scale: 1.0 }
    },

    // EDGE-TTS VOICES (Natural Cloud-based)
    'Natural-Guy': {
        engine: 'edge',
        voice: 'en-US-GuyNeural',
        settings: { rate: '+15%', pitch: '+0Hz' }
    },
    'Natural-Jenny': {
        engine: 'edge',
        voice: 'en-US-JennyNeural',
        settings: { rate: '+15%', pitch: '+0Hz' }
    },
    'Natural-Aria': {
        engine: 'edge',
        voice: 'en-US-AriaNeural',
        settings: { rate: '+15%', pitch: '+0Hz' }
    },
    'Natural-Sonia': {
        engine: 'edge',
        voice: 'en-GB-SoniaNeural',
        settings: { rate: '+15%', pitch: '+0Hz' }
    },
    'Natural-News': {
        engine: 'edge',
        voice: 'en-US-SteffanNeural',
        settings: { rate: '+15%', pitch: '+0Hz' }
    },

    // KOKORO VOICES (Natural Local-based)
    'Expressive-Sarah': {
        engine: 'kokoro',
        voice: 'af_sarah',
        settings: { speed: 1.0 }
    },
    'Expressive-Adam': {
        engine: 'kokoro',
        voice: 'am_adam',
        settings: { speed: 1.0 }
    },
    'Expressive-Bella': {
        engine: 'kokoro',
        voice: 'af_bella',
        settings: { speed: 1.0 }
    },
    'Expressive-Nicole': {
        engine: 'kokoro',
        voice: 'af_nicole',
        settings: { speed: 1.0 }
    },
    'Expressive-Michael': {
        engine: 'kokoro',
        voice: 'am_michael',
        settings: { speed: 1.0 }
    }
};

// Aliases for backward compatibility
const VOICE_ALIASES = {
    'en_US-lessac-high': 'US-Female-Viral',
    'en_US-ryan-high': 'US-Male-Story',
    'en_GB-alba-medium': 'British-Premium',
    'en_US-kusal-medium': 'Indian-English',
    'female': 'US-Female-Viral',
    'male': 'US-Male-Story',
    'british': 'British-Premium',
    'guy': 'Natural-Guy',
    'jenny': 'Natural-Jenny',
    'aria': 'Natural-Aria',
    'sarah': 'Expressive-Sarah',
    'adam': 'Expressive-Adam'
};

/**
 * Downloads a Piper model if missing
 */
async function ensureModel(voiceId) {
    const voiceKey = VOICE_ALIASES[voiceId] || voiceId;
    const voice = VOICE_MODELS[voiceKey];
    if (!voice || voice.engine !== 'piper') return;

    const modelPath = path.join(MODELS_DIR, voice.model);
    const configPath = path.join(MODELS_DIR, voice.config);

    if (fs.existsSync(modelPath) && fs.existsSync(configPath)) return;

    console.log(`Downloading missing Piper model: ${voice.model}...`);
    const baseUrl = 'https://huggingface.co/rhasspy/piper-voices/resolve/main';
    
    const parts = voice.model.split('-');
    const langCode = parts[0]; 
    const family = langCode.split('_')[0]; 
    const name = parts[1]; 
    const quality = parts[2].split('.')[0]; 

    const modelUrl = `${baseUrl}/${family}/${langCode}/${name}/${quality}/${voice.model}?download=true`;
    const configUrl = `${baseUrl}/${family}/${langCode}/${name}/${quality}/${voice.config}?download=true`;

    const download = (url, dest) => {
        return new Promise((resolve, reject) => {
            const curl = spawn('curl.exe', ['-L', '-o', dest, url]);
            curl.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Failed to download ${url}`)));
        });
    };

    await download(modelUrl, modelPath);
    await download(configUrl, configPath);
    console.log(`Downloaded ${voice.model} successfully.`);
}

/**
 * Pre-process text to improve TTS cadence
 */
function preprocessText(text) {
    let clean = text;
    clean = clean.replace(/\*/g, '');
    clean = clean.replace(/(\d+)\.(\d+)/g, '$1 point $2');
    clean = clean.replace(/%/g, ' percent');
    clean = clean.replace(/\b(AI)\b/ig, 'A I');
    clean = clean.replace(/\b(LOL)\b/ig, 'ell oh ell');
    clean = clean.replace(/\b(BTW)\b/ig, 'B T W');
    clean = clean.replace(/\b(However|Therefore|Meanwhile|Next|Finally|Listen|Look)\b/ig, '$1,');
    clean = clean.replace(/\.\.\./g, '... ');
    clean = clean.replace(/([^.!?\n]+)(?=\n|$)/g, '$1.');
    return clean;
}

/**
 * Enhance audio using FFmpeg
 */
async function enhanceAudio(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const masterFilter = [
            'acompressor=threshold=-12dB:ratio=4:attack=5:release=50',
            'equalizer=f=3000:width_type=h:width=1000:g=3',
            'volume=1.8',
            'alimiter=limit=0.9:level=1'
        ].join(',');

        const ffmpeg = spawn('ffmpeg', ['-y', '-i', inputPath, '-af', masterFilter, outputPath]);
        
        let stderr = '';
        ffmpeg.stderr.on('data', d => stderr += d.toString());
        
        ffmpeg.on('close', (code) => {
            if (code === 0) resolve(outputPath);
            else reject(new Error(`FFmpeg enhancement failed: ${stderr}`));
        });
    });
}

/**
 * Synthesize using Piper
 */
async function synthesizePiper(text, voiceId, outputPath, options = {}) {
    await ensureModel(voiceId);
    const voiceKey = VOICE_ALIASES[voiceId] || voiceId;
    const voice = VOICE_MODELS[voiceKey] || VOICE_MODELS['US-Female-Viral'];
    const modelPath = path.join(MODELS_DIR, voice.model);
    const configPath = path.join(MODELS_DIR, voice.config);

    const { noise_scale, noise_w, length_scale } = { ...voice.settings, ...options };

    return new Promise((resolve, reject) => {
        const args = [
            '--model', modelPath,
            '--config', configPath,
            '--output_file', outputPath,
            '--noise_scale', noise_scale.toString(),
            '--noise_w', noise_w.toString(),
            '--length_scale', length_scale.toString()
        ];

        const piper = spawn(PIPER_EXE, args);
        const preparedText = preprocessText(text);
        piper.stdin.write(preparedText);
        piper.stdin.end();

        let stderr = '';
        piper.stderr.on('data', d => stderr += d.toString());

        piper.on('close', async (code) => {
            if (code === 0) {
                if (options.skipEnhance) return resolve(outputPath);
                const enhancedPath = outputPath.replace(/\.[^.]+$/, '_enhanced.wav');
                try {
                    await enhanceAudio(outputPath, enhancedPath);
                    fs.renameSync(enhancedPath, outputPath);
                    resolve(outputPath);
                } catch (e) {
                    resolve(outputPath);
                }
            } else {
                reject(new Error(`Piper failed: ${stderr}`));
            }
        });
    });
}

/**
 * Synthesize using Edge-TTS
 */
async function synthesizeEdge(text, voiceId, outputPath, options = {}) {
    const voiceKey = VOICE_ALIASES[voiceId] || voiceId;
    const voice = VOICE_MODELS[voiceKey] || VOICE_MODELS['Natural-Jenny'];
    const pythonScript = path.join(__dirname, 'edge_tts_helper.py');
    
    return new Promise((resolve, reject) => {
        const { rate, volume, pitch } = { ...voice.settings, ...options };
        const args = [pythonScript, text, voice.voice, outputPath, rate || '+0%', volume || '+0%', pitch || '+0Hz'];
        const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
        const pythonProcess = spawn(pyCmd, args);
        
        let output = '';
        pythonProcess.stdout.on('data', d => output += d.toString());
        pythonProcess.stderr.on('data', d => output += d.toString());
        pythonProcess.on('close', (code) => {
            if (code === 0) resolve(outputPath);
            else reject(new Error(`Edge-TTS failed (code ${code}): ${output}`));
        });
    });
}

/**
 * Synthesize using Kokoro-ONNX
 */
async function synthesizeKokoro(text, voiceId, outputPath, options = {}) {
    const voiceKey = VOICE_ALIASES[voiceId] || voiceId;
    const voice = VOICE_MODELS[voiceKey] || VOICE_MODELS['Expressive-Sarah'];
    const pythonScript = path.join(__dirname, 'kokoro_tts_helper.py');
    
    return new Promise((resolve, reject) => {
        const { speed, lang } = { ...voice.settings, ...options };
        const args = [pythonScript, text, voice.voice, outputPath, speed.toString(), lang || 'en-us'];
        const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
        const pythonProcess = spawn(pyCmd, args);
        
        let output = '';
        pythonProcess.stdout.on('data', d => output += d.toString());
        pythonProcess.stderr.on('data', d => output += d.toString());
        pythonProcess.on('close', (code) => {
            if (code === 0) resolve(outputPath);
            else reject(new Error(`Kokoro failed (code ${code}): ${output}`));
        });
    });
}

/**
 * Unified Synthesize Entry Point
 */
async function synthesize(text, voiceId, outputPath, options = {}) {
    const voiceKey = VOICE_ALIASES[voiceId] || voiceId;
    const voice = VOICE_MODELS[voiceKey] || VOICE_MODELS['US-Female-Viral'];
    
    console.log(`[TTS] Synthesizing with engine: ${voice.engine || 'piper'} | voice: ${voiceId}`);
    
    if (voice.engine === 'edge') {
        return synthesizeEdge(text, voiceId, outputPath, options);
    } else if (voice.engine === 'kokoro') {
        return synthesizeKokoro(text, voiceId, outputPath, options);
    } else {
        return synthesizePiper(text, voiceId, outputPath, options);
    }
}

async function synthesizeViral(text, voiceId, outputPath) {
    return synthesize(text, voiceId, outputPath);
}

module.exports = { synthesize, synthesizeViral, synthesizePiper, synthesizeEdge, synthesizeKokoro, VOICE_MODELS };
