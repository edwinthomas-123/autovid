import sys
import os
import soundfile as sf
from kokoro_onnx import Kokoro

def synthesize(text, voice, output_file, speed=1.0, lang="en-us"):
    try:
        # Load model from local files
        model_path = os.path.join(os.path.dirname(__file__), "kokoro-v1.0.onnx")
        voices_path = os.path.join(os.path.dirname(__file__), "voices-v1.0.bin")
        
        if not os.path.exists(model_path) or not os.path.exists(voices_path):
            print(f"ERROR: Model files not found. Please ensure {model_path} and {voices_path} exist.")
            sys.exit(1)
            
        kokoro = Kokoro(model_path, voices_path)
        samples, sample_rate = kokoro.create(text, voice=voice, speed=speed, lang=lang)
        
        sf.write(output_file, samples, sample_rate)
        print(f"SUCCESS: {output_file}")
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python kokoro_tts_helper.py <text> <voice> <output_file> [speed] [lang]")
        sys.exit(1)
    
    text = sys.argv[1]
    voice = sys.argv[2]
    output_file = sys.argv[3]
    speed = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
    lang = sys.argv[5] if len(sys.argv) > 5 else "en-us"
    
    synthesize(text, voice, output_file, speed, lang)
