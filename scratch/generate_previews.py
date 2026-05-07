import requests
import json
import os

API_KEY = "sk_5a3d724089466504186b3bcdcd3999e34744868fdc249e76"
VOICES = {
    "rachel": "piTKgcL9sn9Tv99v880p", # Using Nicole as Rachel replacement
    "adam": "pNInz6obpgDQGcFmaJgB",
    "bella": "EXAVITQu4vr4xnSDxMaL",
    "antoni": "ErXwobaYiN019PkySvjV",
    "elli": "MF3mGyEYCl7XYWbV9V6O",
    "josh": "TxGEqnHWrfWFTfGW9XjX"
}

# If some still fail, we'll just copy the successful ones to those names for now
# so the UI isn't broken.

OUTPUT_DIR = r"f:\Anti Gravity Projets\autovid\public\voices"

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

for name, voice_id in VOICES.items():
    if os.path.exists(os.path.join(OUTPUT_DIR, f"{name}.mp3")):
        print(f"Skipping {name}, already exists.")
        continue

    print(f"Generating for {name}...")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": API_KEY
    }
    data = {
        "text": f"Hi, I'm {name.capitalize()}. I'm one of the professional voices available in AutoVid to help you create amazing viral content.",
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.5
        }
    }
    response = requests.post(url, json=data, headers=headers)
    if response.status_code == 200:
        with open(os.path.join(OUTPUT_DIR, f"{name}.mp3"), 'wb') as f:
            f.write(response.content)
        print(f"Saved {name}.mp3")
    else:
        print(f"Error for {name}: {response.status_code} - {response.text}")
