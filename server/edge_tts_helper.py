import asyncio
import edge_tts
import sys
import os

async def list_voices():
    voices = await edge_tts.VoicesManager.create()
    # Filter for English voices that sound natural
    filtered = voices.find(Language="en")
    for v in filtered:
        print(f"{v['ShortName']} - {v['Gender']}")

async def synthesize(text, voice, output_file, rate="+0%", volume="+0%", pitch="+0Hz"):
    try:
        print(f"Synthesizing: {voice} -> {output_file}")
        
        # If output is .wav, we synthesize to a temp .mp3 first then convert
        temp_file = output_file
        if output_file.lower().endswith(".wav"):
            temp_file = output_file + ".mp3"
            
        communicate = edge_tts.Communicate(text, voice, rate=rate, volume=volume, pitch=pitch)
        await communicate.save(temp_file)
        
        if temp_file != output_file:
            print(f"Converting {temp_file} to {output_file}...")
            os.system(f'ffmpeg -y -i "{temp_file}" "{output_file}"')
            if os.path.exists(temp_file):
                os.remove(temp_file)
                
        print(f"SUCCESS: {output_file}")
    except Exception as e:
        import traceback
        print(f"ERROR: {str(e)}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python edge_tts_helper.py <text> <voice> <output_file> [rate] [volume] [pitch]")
        sys.exit(1)
    
    text = sys.argv[1]
    voice = sys.argv[2]
    output_file = sys.argv[3]
    rate = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != 'undefined' else "+0%"
    volume = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] != 'undefined' else "+0%"
    pitch = sys.argv[6] if len(sys.argv) > 6 and sys.argv[6] != 'undefined' else "+0Hz"
    
    asyncio.run(synthesize(text, voice, output_file, rate, volume, pitch))
