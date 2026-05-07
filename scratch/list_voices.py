import requests
import json

API_KEY = "sk_5a3d724089466504186b3bcdcd3999e34744868fdc249e76"
url = "https://api.elevenlabs.io/v1/voices"
headers = {
    "xi-api-key": API_KEY
}
response = requests.get(url, headers=headers)
if response.status_code == 200:
    voices = response.json()['voices']
    for v in voices:
        print(f"{v['name']}: {v['voice_id']}")
else:
    print(f"Error: {response.status_code} - {response.text}")
