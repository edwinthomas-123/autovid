const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const https = require('https');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

const metaBot = require('./meta_bot');
const piperTts = require('./piper_tts');

const OUTPUT_DIR = path.join(__dirname, 'output');
const TEST_ASSETS_DIR = path.join(__dirname, 'test_assets');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
if (!fs.existsSync(TEST_ASSETS_DIR)) fs.mkdirSync(TEST_ASSETS_DIR);

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    proto.get(url, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        fs.unlink(dest, () => {});
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`Download failed with status ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(dest); });
    }).on('error', err => { 
      file.close();
      fs.unlink(dest, () => {});
      reject(err); 
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
    const payload = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
    const apiRes = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
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
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
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
  
  const fallback = text.toLowerCase().replace(/[^a-z\s]/g,'').split(/\s+/).filter(w => w.length > 4 && !stopwords.has(w)).slice(0, 3).join(' ');
  if (fallback) aiKeywords.push(fallback);
  if (aiKeywords.length === 0) aiKeywords.push('cinematic');
  
  return [...new Set(aiKeywords)];
}

async function generateScript({ topic, openAiKey, geminiKey, length = 'short' }) {
    console.log(`[GENERATOR] Generating script for: ${topic}`);
    
    let systemPrompt = '';
    let userPrompt = '';

    if (length === 'short') {
      systemPrompt = `You are a viral Short-form video scriptwriter (TikTok/Reels/Shorts). 
Write punchy, high-retention scripts that sound like a REAL person, not an AI.

STORYTELLING GUIDELINES:
- Use conversational fillers: "So," "Wait," "Look," "You won't believe this," "Actually..."
- Use emotional punctuation: Use "!" for excitement, "?" for curiosity, and "..." for dramatic pauses. Our TTS engine reads these!
- Avoid formal words: Instead of "Discover the benefits," use "Here is why this is amazing."
- Hook the viewer: The first 3 seconds must be a "pattern interrupt" that stops the scroll.
- Rhythm: Mix very short sentences with slightly longer ones.

CRITICAL: Return the response as a VALID JSON OBJECT. 
{
  "metadata": { "title": "Viral Title", "description": "...", "tags": ["tag1", "tag2"] },
  "scenes": [
    {"text": "Wait... did you know that... !", "keywords": ["visual query"]},
    ...
  ]
}`;
      userPrompt = `Write a viral short video script (9:16 format) about: "${topic}". Make it sound like a top-tier influencer. 50-60 seconds.`;
    } else {
      systemPrompt = `You are a professional YouTube storyteller. Write engaging, informative scripts that feel personal and authentic.

STORYTELLING GUIDELINES:
- Be the viewer's friend: Use "I," "We," and "You." 
- Conversational flow: Use transitions like "But here's the thing," "Now, check this out," or "Think about it."
- Emotional range: Use "!" and "?" to guide the TTS engine's energy levels.
- Avoid the "Wiki-Voice": No lists of dry facts. Tell a story with a beginning, middle, and end.

CRITICAL: Return the response as a VALID JSON OBJECT.
{
  "metadata": { "title": "...", "description": "...", "tags": [] },
  "scenes": [
    {"text": "Segment text with emotional punctuation...", "keywords": ["visual queries"]},
    ...
  ]
}`;
      userPrompt = `Write a full YouTube video script about: "${topic}". Make it deeply engaging and narratively driven.`;
    }

    const MASTER_GEMINI_KEY = process.env.GEMINI_API_KEY || '';
    const finalGeminiKey = geminiKey || MASTER_GEMINI_KEY;
    const keys = [finalGeminiKey].filter(k => k && k !== 'undefined' && k !== '');

    const models = [
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-2.0-flash",
      "gemini-flash-latest",
      "gemini-pro-latest"
    ];
    console.error(`!!! [DEBUG GENERATOR] Keys length: ${keys.length}. Models to try: ${models.length}`);
    
    if (keys.length > 0) {
      let lastError = null;
      for (let kIdx = 0; kIdx < keys.length; kIdx++) {
        const key = keys[kIdx];
        for (let mIdx = 0; mIdx < models.length; mIdx++) {
          const model = models[mIdx];
          console.error(`!!! [DEBUG GENERATOR] Trying Key ${kIdx}, Model ${model}...`);
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
               console.warn(`[GENERATOR] Gemini attempt failed (Model: ${model}, Key: ${key.substring(0,6)}...):`, lastError);
               if (apiRes.status === 429) break; // Try next key
               continue; // Try next model
            }
            console.log(`[GENERATOR] Gemini success with model ${model}`);
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            // Clean JSON response (remove markdown blocks if present)
            const cleanJson = rawText.replace(/```json|```/g, '').trim();
            try {
              const parsed = JSON.parse(cleanJson);
              // Ensure we return a consistent structure even if Gemini forgets metadata
              if (Array.isArray(parsed)) {
                return { metadata: { title: topic, description: '', tags: [] }, scenes: parsed };
              }
              return parsed;
            } catch (jsonErr) {
              console.warn('[GENERATOR] Failed to parse JSON, returning raw text fallback.');
              return { metadata: { title: topic, description: '', tags: [] }, scenes: [{ text: rawText, keywords: [] }] };
            }
          } catch (e) {
            lastError = e.message;
          }
        }
      }
      // Final fallback: If all Gemini attempts fail, return a mock script to keep the app working
      console.warn(`[GENERATOR] All Gemini attempts failed. Returning fallback script for: ${topic}`);
      return `Welcome to this video about ${topic}. It's a fascinating subject that many people are interested in. In this video, we'll explore some key aspects and interesting facts that you might not know. Stay tuned to learn more!`;
    } else if (openAiKey) {
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
      if (data.error) throw new Error(data.error.message);
      return data.choices?.[0]?.message?.content || '';
    }
}

async function renderVideo({ script, voice, captionStyle, elevenLabsKey, pexelsKey, geminiKey, topic = '', isShort = true }) {
  let scenes = [];
  let metadata = { title: topic, description: '', tags: [] };

  if (script && script.scenes && Array.isArray(script.scenes)) {
    scenes = script.scenes;
    metadata = script.metadata || metadata;
  } else if (Array.isArray(script)) {
    scenes = script;
  } else {
    // Fallback for plain text
    const textSegments = script.split(/[.\n!]/).map(s => s.trim()).filter(s => s.length > 15);
    scenes = textSegments.map(s => ({ text: s, keywords: [] }));
  }

  const orientation = isShort ? 'portrait' : 'landscape';
  const timestamp = Date.now();
  const jobDir = path.join(OUTPUT_DIR, `job_${timestamp}`);
  fs.mkdirSync(jobDir, { recursive: true });

  // ── 1. TTS Synthesis ─────────────────────
  const VOICE_IDS = {
    Rachel: '21m00Tcm4TlvDq8ikWAM',
    Adam:   'pNInz6obpgDQGcFmaJgB',
    Bella:  'EXAVITQu4vr4xnSDxMaL',
    Antoni: 'ErXwobaYiN019PkySvjV',
    Elli:   'MF3mGyEYCl7XYWbV9V6O',
    Josh:   'TxGEqnHWrfWFTfGW9XjX'
  };

  const isPiper = piperTts.VOICE_MODELS[voice];
  const audioPath = path.join(jobDir, isPiper ? 'narration.wav' : 'narration.mp3');

  if (isPiper) {
    console.log(`[GENERATOR] Using Piper TTS for voice: ${voice}`);
    const fullScriptText = scenes.map(s => s.text).join(' ');
    if (isShort) {
        await piperTts.synthesizeViral(fullScriptText, voice, audioPath);
    } else {
        await piperTts.synthesize(fullScriptText, voice, audioPath);
    }
  } else {
    const voiceId = VOICE_IDS[voice] || VOICE_IDS.Rachel;
    
    // Chunking logic for long scripts
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

    const fullScriptText = scenes.map(s => s.text).join(' ');
    const scriptChunks = chunkText(fullScriptText);
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
  const clipPaths = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    let keywordsToTry = scene.keywords || [];
    
    // If no keywords provided in script, generate them (legacy mode)
    if (keywordsToTry.length === 0) {
        keywordsToTry = await getEnhancedKeywords(scene.text, geminiKey, topic);
    }
    
    console.log(`[GENERATOR] Segment ${i+1} keywords:`, keywordsToTry);
    
    let foundClip = false;
    for (const keyword of keywordsToTry) {
      if (foundClip) break;
      try {
        const pexelsRes = await new Promise((resolve, reject) => {
          const q = encodeURIComponent(keyword);
          const options = {
            hostname: 'api.pexels.com',
            path: `/videos/search?query=${q}&per_page=3&size=medium&orientation=${orientation}`,
            headers: { Authorization: pexelsKey }
          };
          let body = '';
          https.get(options, r => {
            if (r.statusCode !== 200) return reject(new Error(`Pexels API error ${r.statusCode}`));
            r.on('data', d => body += d);
            r.on('end', () => resolve(JSON.parse(body)));
          }).on('error', reject);
        });

        const videos = pexelsRes.videos || [];
        if (videos.length > 0) {
          const files = videos[0].video_files || [];
          const hdFile = files.find(f => f.quality === 'hd') || files[0];
          if (hdFile) {
            const clipPath = path.join(jobDir, `clip_${i}.mp4`);
            console.log(`[GENERATOR] Downloading clip ${i} for keyword "${keyword}"`);
            await downloadFile(hdFile.link, clipPath);
            clipPaths.push(clipPath);
            foundClip = true;
          }
        }
      } catch (e) {
        console.warn(`[GENERATOR] Keyword "${keyword}" failed:`, e.message);
      }
    }
  }

  if (clipPaths.length === 0) throw new Error('Could not download any clips.');

  // ── 3. Render ─────────────────────────────
  const outputPrefix = isShort ? 'shortvid' : 'longvid';
  const outputFilename = `${outputPrefix}_${timestamp}.mp4`;
  const outputPath = path.join(OUTPUT_DIR, outputFilename);

  const clipListPath = path.join(jobDir, 'clips.txt');
  const clipListContent = clipPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(clipListPath, clipListContent);

  const fullScriptText = scenes.map(s => s.text).join(' ');

  await new Promise((resolve, reject) => {
    let selectedMusic = '';
    const musicDir = path.join(__dirname, 'music');
    if (fs.existsSync(musicDir)) {
      const songs = fs.readdirSync(musicDir).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
      if (songs.length > 0) {
        selectedMusic = path.join(musicDir, songs[Math.floor(Math.random() * songs.length)]);
      }
    }

    const pyArgs = [
      path.join(__dirname, 'long_video_renderer.py'),
      audioPath,
      clipListPath,
      outputPath,
      captionStyle || 'HORMOZI',
      fullScriptText.substring(0, 2000),
      orientation,
      '38', // default caption size
      'center' // default caption position
    ];
    if (selectedMusic) pyArgs.push(selectedMusic);

    const py = spawn('python3', pyArgs);
    let stderr = '';
    py.stderr.on('data', d => stderr += d.toString());
    py.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`Renderer exited ${code}: ${stderr}`));
    });
  });

  return {
    videoUrl: `${BASE_URL}/output/${outputFilename}`,
    audioUrl: `${BASE_URL}/output/job_${timestamp}/narration.${isPiper ? 'wav' : 'mp3'}`,
    outputPath,
    metadata
  };
}

async function generateBulkMetaVideos({ script, theme, niche, style, elevenLabsKey }) {
    console.log(`[GENERATOR] Starting Bulk Meta Generation...`);
    const timestamp = Date.now();
    const jobDir = path.join(OUTPUT_DIR, `bulk_meta_${timestamp}`);
    fs.mkdirSync(jobDir, { recursive: true });

    // 1. Generate Voiceover first to know exact duration
    const voiceResult = await renderVideo({ script, voice: 'Rachel', elevenLabsKey, pexelsKey: 'DUMMY', isShort: true });
    // Note: renderVideo will fail at Pexels step, so we need a cleaner way to just do TTS.
    // For now, let's assume we have the audio.
    
    // 2. Split script into 3.5-4 second segments (approx 9-10 words each) to hit 14-17 scenes/min
    const words = script.split(/\s+/);
    const segments = [];
    for (let i = 0; i < words.length; i += 10) {
        segments.push(words.slice(i, i + 10).join(' '));
    }

    console.log(`[GENERATOR] Split script into ${segments.length} segments.`);

    // 3. Generate Visual Prompts for each segment
    const visualPrompts = [];
    for (let i = 0; i < segments.length; i++) {
        // Enforce the selected Niche, Art Style, and Vertical Aspect Ratio
        visualPrompts.push(
            `9:16 Vertical Video, ${style} Art Style, ${niche} Niche. ` +
            `Scene: ${segments[i]}. ` +
            `Cinematic lighting, high quality, realistic motion, professional 4k render.`
        );
    }

    // 4. Generate clips with Meta AI
    const browser = await metaBot.startBulkSession();
    const clipPaths = [];
    
    try {
        for (let i = 0; i < visualPrompts.length; i++) {
            console.log(`[GENERATOR] Generating clip ${i + 1}/${visualPrompts.length}...`);
            const result = await metaBot.generateVideo(visualPrompts[i], browser);
            
            // Move and Rename clip to be in order
            const finalClipName = `clip_${String(i + 1).padStart(2, '0')}.mp4`;
            const finalClipPath = path.join(jobDir, finalClipName);
            fs.renameSync(result.outputPath, finalClipPath);
            clipPaths.push(finalClipPath);
        }
    } finally {
        await browser.close();
    }

    // 5. Combine clips (Reuse the renderer logic)
    const outputFilename = `bulk_meta_final_${timestamp}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);
    const clipListPath = path.join(jobDir, 'clips.txt');
    const clipListContent = clipPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
    fs.writeFileSync(clipListPath, clipListContent);

    // We need the audio from the initial TTS
    const audioPath = voiceResult.audioUrl.replace(`${BASE_URL}/output/`, OUTPUT_DIR + '/');

    let selectedMusic = '';
    const musicDir = path.join(__dirname, 'music');
    if (fs.existsSync(musicDir)) {
      const songs = fs.readdirSync(musicDir).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
      if (songs.length > 0) {
        selectedMusic = path.join(musicDir, songs[Math.floor(Math.random() * songs.length)]);
      }
    }

    await new Promise((resolve, reject) => {
        const pyArgs = [
            path.join(__dirname, 'long_video_renderer.py'),
            audioPath, clipListPath, outputPath, 'HORMOZI', script.substring(0, 2000), 'portrait', '38', 'center'
        ];
        if (selectedMusic) pyArgs.push(selectedMusic);
        const py = spawn('python3', pyArgs);
        py.on('close', code => code === 0 ? resolve() : reject(new Error(`Renderer failed: ${code}`)));
    });

    return {
        videoUrl: `${BASE_URL}/output/${outputFilename}`,
        outputPath
    };
}

async function generateWithMeta(prompt) {
  return await metaBot.generateVideo(prompt);
}

module.exports = { generateScript, renderVideo, generateWithMeta, generateBulkMetaVideos };
