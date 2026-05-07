const fs = require('fs');

const data = JSON.parse(fs.readFileSync('C:\\Users\\njaana\\.gemini\\antigravity\\brain\\eb2f11fb-5c2a-4c08-ba6c-2d524780c0ef\\.system_generated\\steps\\33\\content.md', 'utf8').split('\n').slice(4).join('\n'));

const englishVoices = Object.values(data)
    .filter(v => v.language.code.startsWith('en_'))
    .map(v => ({
        id: v.key,
        name: `${v.name.charAt(0).toUpperCase() + v.name.slice(1)} (${v.quality})`,
        lang: v.language.code,
        quality: v.quality,
        region: v.language.region,
        files: Object.keys(v.files).filter(f => f.endsWith('.onnx') || f.endsWith('.onnx.json'))
    }));

console.log(JSON.stringify(englishVoices, null, 2));
