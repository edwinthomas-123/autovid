const tts = require('./piper_tts');
const path = require('path');
const fs = require('fs');

async function testVoices() {
    const testText = "Hello! This is a test of the Auto Vid voice engines. I am checking to see how natural and expressive I sound.";
    
    const tests = [
        { name: 'Natural_Edge', voice: 'Natural-Jenny' },
        { name: 'Expressive_Kokoro', voice: 'Expressive-Sarah' },
        { name: 'Viral_Piper', voice: 'US-Female-Viral' }
    ];

    console.log('--- STARTING VOICE TEST ---');

    for (const test of tests) {
        const outputPath = path.join(__dirname, 'output', `${test.name}_test.mp3`);
        console.log(`Testing [${test.name}] with voice [${test.voice}]...`);
        
        try {
            await tts.synthesize(testText, test.voice, outputPath);
            console.log(`✅ Success! Saved to: ${outputPath}`);
        } catch (error) {
            console.error(`❌ Failed [${test.name}]:`, error.message);
        }
    }

    console.log('--- TEST COMPLETE ---');
    console.log('You can find the audio files in the server/output folder.');
}

testVoices();
