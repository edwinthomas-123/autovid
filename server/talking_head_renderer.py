import sys
import os
import subprocess
import json
import re
import tempfile
import whisper
from datetime import datetime

def run(cmd, check=True):
    print(' '.join(str(c) for c in cmd), flush=True)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if check and result.returncode != 0:
        print(result.stderr, file=sys.stderr)
        sys.exit(1)
    return result

def get_duration(path):
    r = run(['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', path], check=False)
    try:
        return float(json.loads(r.stdout)['format']['duration'])
    except:
        return 0.0

def format_timestamp(seconds):
    h, m, s = int(seconds//3600), int((seconds%3600)//60), seconds%60
    return f"{h:01d}:{m:02d}:{s:05.2f}"

def create_ass_file(transcription, style_name, output_ass_path, font_size=38, position='center'):
    styles = {
        'MRBEAST': {'font': 'Komika Axis', 'primary': '&H0000FFFF', 'highlight': '&H00FFFFFF', 'outline': '&H00000000'},
        'BOLD': {'font': 'Arial Black', 'primary': '&H00FFFFFF', 'highlight': '&H0000FFFF', 'outline': '&H00000000'},
        'DYNAMICS': {'font': 'Arial Black', 'primary': '&H00FFFFFF', 'highlight': '&H00FFFF00', 'outline': '&H00000000'},
        'GLOW': {'font': 'Arial Black', 'primary': '&H0000FF00', 'highlight': '&H00FFFFFF', 'outline': '&H00000000'},
        'MINIMAL': {'font': 'Arial', 'primary': '&H00FFFFFF', 'highlight': '&H00FF0000', 'outline': '&H00000000'},
        'HORMOZI': {'font': 'Arial Black', 'primary': '&H00FFFFFF', 'highlight': '&H0064F2BE', 'outline': '&H00000000'}
    }
    s = styles.get(style_name, styles['MRBEAST'])
    
    # Viral colors for highlights
    highlight_colors = ['&H0000FFFF', '&H0000FF00', '&H00FFFF00', '&H00FFFFFF']
    
    alignment = 5 if position == 'center' else 2
    margin_v = 100 if position == 'center' else 320 # Standard for 720x1280
    
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{s['font']},{font_size},{s['primary']},&H000000FF,{s['outline']},&H00000000,-1,0,0,0,100,100,0,0,1,3,0,{alignment},10,10,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    pop_timestamps = []
    with open(output_ass_path, 'w', encoding='utf-8') as f:
        f.write(header)
        
        all_words = []
        for segment in transcription['segments']:
            if 'words' in segment:
                all_words.extend(segment['words'])
            else:
                w_list = segment['text'].split()
                dur = segment['end'] - segment['start']
                per_w = dur / max(1, len(w_list))
                for i, w in enumerate(w_list):
                    all_words.append({'word': w, 'start': segment['start'] + i * per_w, 'end': segment['start'] + (i+1) * per_w})
        
        i = 0
        while i < len(all_words):
            chunk_size = 2 if len(all_words[i]['word']) > 6 else 3
            chunk = all_words[i:i+chunk_size]
            
            # SFX pop logic removed
            import random
            h_color = random.choice(highlight_colors)
            
            for j in range(len(chunk)):
                w_start = format_timestamp(chunk[j]['start'])
                w_end = format_timestamp(chunk[j]['end'])
                text_parts = []
                for k in range(len(chunk)):
                    word_text = chunk[k]['word'].strip().upper()
                    word_text = "".join(c for c in word_text if c.isalnum())
                    
                    if k == j:
                        # ACTIVE WORD logic: Color Highlight + Scale Up + Bold
                        text_parts.append(f"{{\\c{h_color}\\fscx120\\fscy120\\b1}}{word_text}{{\\b0\\fscx100\\fscy100\\c{s['primary']}}}")
                    else:
                        text_parts.append(word_text)
                full_text = " ".join(text_parts)
                f.write(f"Dialogue: 0,{w_start},{w_end},Default,,0,0,0,,{full_text}\n")
            i += chunk_size
    return pop_timestamps

def main():
    if len(sys.argv) < 7:
        print("Usage: talking_head_renderer.py <audio> <background_clip> <image_list_json> <output> <style> <script> <character_img> [font_size] [position]")
        sys.exit(1)

    audio_path = sys.argv[1]
    bg_path = sys.argv[2]
    image_list_json = sys.argv[3]
    output_path = sys.argv[4]
    style = sys.argv[5]
    script_text = sys.argv[6]
    character_img = sys.argv[7]
    font_size = int(sys.argv[8]) if len(sys.argv) > 8 else 38
    position = sys.argv[9] if len(sys.argv) > 9 else 'center'
    music_path = sys.argv[10] if len(sys.argv) > 10 else None

    audio_dur = get_duration(audio_path)
    images = json.loads(image_list_json)

    tmpdir = tempfile.mkdtemp()
    
    # ── Transcribe for captions ───────────────
    print("Transcribing audio for captions...", flush=True)
    model = whisper.load_model("base")
    transcription = model.transcribe(audio_path, word_timestamps=True)

    # 1. Prepare Background
    bg_dur = get_duration(bg_path)
    prepared_bg = os.path.join(tmpdir, "prepared_bg.mp4")
    # Speed up slightly (0.85*PTS) and use CROP TO FILL to avoid stretching
    crop_fill = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1"
    
    if bg_dur < audio_dur:
        run(['ffmpeg', '-y', '-stream_loop', '-1', '-i', bg_path, '-t', str(audio_dur), 
             '-vf', f'setpts=0.85*PTS,{crop_fill}', '-c:v', 'libx264', '-preset', 'ultrafast', prepared_bg])
    else:
        run(['ffmpeg', '-y', '-i', bg_path, '-t', str(audio_dur), 
             '-vf', f'setpts=0.85*PTS,{crop_fill}', '-c:v', 'libx264', '-preset', 'ultrafast', prepared_bg])

    # 2. Build Filter Complex
    filter_complex = ""
    inputs = [prepared_bg]
    current_v = "[0:v]"
    for i, img in enumerate(images):
        img_path = img['path']
        start = img['start']
        end = img['end']
        inputs.append(img_path)
        filter_complex += f"[{i+1}:v]scale=480:270:force_original_aspect_ratio=increase,crop=480:270[scaled{i}];"
        filter_complex += f"{current_v}[scaled{i}]overlay=(W-w)/2:80:enable='between(t,{start},{end})'[v{i}];"
        current_v = f"[v{i}]"

    if character_img and os.path.exists(character_img):
        char_idx = len(inputs)
        inputs.append(character_img)
        filter_complex += f"[{char_idx}:v]scale=250:-1[char];"
        filter_complex += f"{current_v}[char]overlay=W-w-10:H-h-10[vchar];"
        current_v = "[vchar]"

    # 3. Create ASS & Get SFX Triggers
    output_ass = os.path.join(tmpdir, "subs.ass")
    pop_times = create_ass_file(transcription, style, output_ass, font_size, position)
    abs_ass = os.path.abspath(output_ass).replace('\\', '/').replace(':', '\\:')

    # 4. Final Render with Cinematic Filters, Background Music & SFX
    sfx_path = os.path.join(os.path.dirname(__file__), 'sfx', 'pop.wav')
    
    # Construction: inputs = [prepared_bg, ...images, character, music, sfx, audio_path]
    # We must be very careful with indices.
    
    all_inputs = []
    for inp in inputs: all_inputs.append(inp)
    
    music_idx = -1
    if music_path and os.path.exists(music_path):
        all_inputs.append(music_path)
        music_idx = len(all_inputs) - 1
        
    sfx_in_idx = -1
    if os.path.exists(sfx_path) and pop_times:
        all_inputs.append(sfx_path)
        sfx_in_idx = len(all_inputs) - 1
        
    all_inputs.append(audio_path)
    narration_idx = len(all_inputs) - 1

    # Audio Filter Chain
    a_out_node = f"[{narration_idx}:a]"
    
    if music_idx != -1:
        filter_complex += f"[{music_idx}:a]volume=0.4[bg_vol];[bg_vol][{narration_idx}:a]sidechaincompress=threshold=0.1:ratio=20:release=500[ducked];[{narration_idx}:a][ducked]amix=inputs=2:duration=first[a_mixed];"
        a_out_node = "[a_mixed]"
        
    # SFX Pops Removed as requested
    pass

    # Dynamic Vignette: Stronger for Ghost Stories/Documentaries, Lighter for others
    dark_keywords = ['ghost', 'horror', 'scary', 'mystery', 'documentary', 'history', 'dark', 'creepy', 'ancient', 'true crime']
    is_dark_theme = any(k in script_text.lower() for k in dark_keywords)
    vignette_val = "PI/4" if is_dark_theme else "PI/10"
    
    # Visual Polish
    visual_filters = f"{current_v}ass='{abs_ass}',vignette={vignette_val},noise=alls=5:allf=t+u,eq=contrast=1.1:saturation=1.2[outv]"
    
    cmd = ['ffmpeg', '-y']
    for idx, inp in enumerate(all_inputs):
        if idx == music_idx: cmd.extend(['-stream_loop', '-1', '-i', inp])
        else: cmd.extend(['-i', inp])
        
    cmd.extend([
        '-filter_complex', filter_complex + visual_filters,
        '-map', '[outv]',
        '-map', a_out_node,
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21',
        '-c:a', 'aac', '-shortest',
        output_path
    ])
    run(cmd)

if __name__ == "__main__":
    main()
