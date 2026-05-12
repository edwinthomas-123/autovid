#!/usr/bin/env python3
"""
long_video_renderer.py
Usage: python long_video_renderer.py <audio_path> <clip_list_txt> <output_path> <caption_style> <script_text> <orientation> <caption_size> <caption_position>

Concatenates B-roll clips to match audio duration, transcribes with Whisper,
and burns in karaoke-style captions using ASS.
"""

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
    except Exception:
        return 0.0

def format_timestamp(seconds):
    h, m, s = int(seconds//3600), int((seconds%3600)//60), seconds%60
    return f"{h:01d}:{m:02d}:{s:05.2f}"

def create_ass_file(transcription, style_name, output_ass_path, font_size=38, position='center'):
    # styles config (Keep consistent with processor.py)
    styles = {
        'MRBEAST': {'font': 'Komika Axis', 'primary': '&H0000FFFF', 'highlight': '&H00FFFFFF', 'outline': '&H00000000'},
        'BOLD': {'font': 'Arial Black', 'primary': '&H00FFFFFF', 'highlight': '&H0000FFFF', 'outline': '&H00000000'},
        'DYNAMICS': {'font': 'Arial Black', 'primary': '&H00FFFFFF', 'highlight': '&H00FFFF00', 'outline': '&H00000000'},
        'GLOW': {'font': 'Arial Black', 'primary': '&H0000FF00', 'highlight': '&H00FFFFFF', 'outline': '&H00000000'},
        'MINIMAL': {'font': 'Arial', 'primary': '&H00FFFFFF', 'highlight': '&H00FF0000', 'outline': '&H00000000'},
        'HORMOZI': {'font': 'Arial Black', 'primary': '&H00FFFFFF', 'highlight': '&H0064F2BE', 'outline': '&H00000000'}
    }
    s = styles.get(style_name, styles['MRBEAST'])
    
    # Viral colors for highlights: Yellow, Lime, Cyan, White
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
        
        # Flatten words from all segments
        all_words = []
        for segment in transcription['segments']:
            if 'words' in segment:
                all_words.extend(segment['words'])
            else:
                # Fallback if no word timestamps
                w_list = segment['text'].split()
                dur = segment['end'] - segment['start']
                per_w = dur / max(1, len(w_list))
                for i, w in enumerate(w_list):
                    all_words.append({
                        'word': w,
                        'start': segment['start'] + i * per_w,
                        'end': segment['start'] + (i+1) * per_w
                    })
        
        # Group into words (2-3 words per chunk for high pacing)
        i = 0
        while i < len(all_words):
            chunk_size = 2 if len(all_words[i]['word']) > 6 else 3
            chunk = all_words[i:i+chunk_size]
            
            # SFX pop logic removed
            # Pick a random highlight color for this chunk
            import random
            h_color = random.choice(highlight_colors)
            
            # For each word in the chunk, create a dialogue line that highlights it
            for j in range(len(chunk)):
                w_start = format_timestamp(chunk[j]['start'])
                w_end = format_timestamp(chunk[j]['end'])
                
                text_parts = []
                for k in range(len(chunk)):
                    word_text = chunk[k]['word'].strip().upper()
                    # Remove punctuation for cleaner captions
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
        print("Usage: long_video_renderer.py <audio> <clip_list> <output> <style> <script> <orientation> [font_size] [position] [music_path]", file=sys.stderr)
        sys.exit(1)

    audio_path   = sys.argv[1]
    clip_list    = sys.argv[2]
    output_path  = sys.argv[3]
    style        = sys.argv[4]
    script_text  = sys.argv[5]
    orientation  = sys.argv[6]
    font_size    = int(sys.argv[7]) if len(sys.argv) > 7 else 38
    position     = sys.argv[8] if len(sys.argv) > 8 else 'center'
    music_path   = sys.argv[9] if len(sys.argv) > 9 else None

    # ── Get audio duration ────────────────────
    audio_dur = get_duration(audio_path)
    if audio_dur <= 0:
        print(f"ERROR: Cannot read audio duration from {audio_path}", file=sys.stderr)
        sys.exit(1)
    print(f"Audio duration: {audio_dur:.2f}s", flush=True)

    # ── Transcribe for captions ───────────────
    print("Transcribing audio for captions...", flush=True)
    model = whisper.load_model("base")
    transcription = model.transcribe(audio_path, word_timestamps=True)

    # ── Read clip list ─────────────────────────
    with open(clip_list, 'r') as f:
        clip_paths = [line.strip().replace("file '", '').rstrip("'") for line in f if line.strip()]

    if not clip_paths:
        print("ERROR: No clips in list", file=sys.stderr)
        sys.exit(1)

    tmpdir = tempfile.mkdtemp()
    res = '720:1280' if orientation == 'portrait' else '1280:720'

    # ── Trim / loop clips to fill audio duration ──
    transition_duration = 0.5
    num_clips = len(clip_paths)
    if num_clips > 1:
        per_clip = (audio_dur + (num_clips - 1) * transition_duration) / num_clips
    else:
        per_clip = audio_dur

    trimmed = []
    for i, clip in enumerate(clip_paths):
        out_clip = os.path.join(tmpdir, f"tc_{i}.mp4")
        # Scale and crop to fit vertical/horizontal
        is_image = clip.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))
        
        cmd = ['ffmpeg', '-y']
        if is_image:
            cmd += ['-loop', '1']
        else:
            # Check duration and loop if too short
            clip_dur = get_duration(clip)
            if clip_dur > 0 and clip_dur < per_clip:
                cmd += ['-stream_loop', '-1']
        
        # Dynamic Zoom Effect (Ken Burns)
        # Alternate between zoom-in and zoom-out
        w, h = res.split(':')
        if i % 2 == 0:
            # Zoom In
            zoom_filter = f"zoompan=z='min(zoom+0.0008,1.1)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}"
        else:
            # Zoom Out
            zoom_filter = f"zoompan=z='max(1.1-0.0008*on,1.0)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}"

        cmd += [
             '-i', clip,
             '-t', str(per_clip),
             '-vf', f'scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1,{zoom_filter}',
             '-r', '25', '-c:v', 'libx264', '-preset', 'fast', '-an',
             out_clip
        ]
        result = run(cmd, check=False)
        if result.returncode == 0:
            trimmed.append(out_clip)
        else:
            print(f"WARNING: Skipping corrupted clip: {clip}", file=sys.stderr)

    if not trimmed:
        print("ERROR: All clips were corrupted or could not be processed", file=sys.stderr)
        sys.exit(1)

    # ── Concat all trimmed clips with transitions ──────────────
    concat_video = os.path.join(tmpdir, 'concat.mp4')
    if len(trimmed) > 1 and per_clip > transition_duration * 2:
        filter_complex = ""
        inputs = []
        for tc in trimmed:
            inputs.extend(["-i", tc])
        
        last_out = "[0:v]"
        current_length = per_clip
        for i in range(1, len(trimmed)):
            offset = current_length - transition_duration
            out_node = f"[v{i}]"
            filter_complex += f"{last_out}[{i}:v]xfade=transition=fade:duration={transition_duration}:offset={offset}{out_node};"
            last_out = out_node
            current_length = current_length + per_clip - transition_duration
            
        filter_complex = filter_complex.rstrip(";")
        
        cmd = ['ffmpeg', '-y'] + inputs + [
            '-filter_complex', filter_complex,
            '-map', last_out,
            '-c:v', 'libx264', '-preset', 'fast', '-an',
            concat_video
        ]
        run(cmd)
    else:
        concat_list = os.path.join(tmpdir, 'concat.txt')
        with open(concat_list, 'w') as f:
            for tc in trimmed:
                f.write(f"file '{tc.replace(os.sep, '/')}'\n")

        run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_list,
             '-c', 'copy', concat_video])

    # ── Mix video + audio (with optional background music) ─────────────
    mixed = os.path.join(tmpdir, 'mixed.mp4')
    if music_path and os.path.exists(music_path):
        print(f"Mixing background music: {music_path}", flush=True)
        # Mix with sidechain compression (ducking)
        # [0:a] is main narration, [1:a] is background music
        # Threshold 0.1, Ratio 20:1, Release 500ms
        run(['ffmpeg', '-y',
             '-i', concat_video,
             '-i', audio_path,
             '-stream_loop', '-1', '-i', music_path,
             '-filter_complex', 
             '[2:a]volume=0.4[bg];[bg][1:a]sidechaincompress=threshold=0.1:ratio=20:release=500[ducked];[1:a][ducked]amix=inputs=2:duration=first[aout]',
             '-map', '0:v:0', '-map', '[aout]',
             '-shortest',
             '-c:v', 'copy', '-c:a', 'aac',
             mixed])
    else:
        run(['ffmpeg', '-y',
             '-i', concat_video,
             '-i', audio_path,
             '-map', '0:v:0', '-map', '1:a:0',
             '-shortest',
             '-c:v', 'copy', '-c:a', 'aac',
             mixed])

    # ── Create and Burn captions with Cinematic Filters & SFX ──────────────
    output_ass = os.path.join(tmpdir, "subs.ass")
    pop_times = create_ass_file(transcription, style, output_ass, font_size, position)
    
    # SFX Pops Removed as requested
    final_mixed = mixed

    # Use proper absolute path for ASS
    abs_ass = os.path.abspath(output_ass).replace('\\', '/').replace(':', '\\:')
    
    # Dynamic Vignette: Stronger for Ghost Stories/Documentaries, Lighter for others
    dark_keywords = ['ghost', 'horror', 'scary', 'mystery', 'documentary', 'history', 'dark', 'creepy', 'ancient', 'true crime']
    is_dark_theme = any(k in script_text.lower() for k in dark_keywords)
    vignette_val = "PI/4" if is_dark_theme else "PI/10" # Very low for normal shorts
    
    # Visual Polish: Vignette + Subtle Noise + Contrast
    visual_filters = f"ass='{abs_ass}',vignette={vignette_val},noise=alls=5:allf=t+u,eq=contrast=1.1:saturation=1.2"
    
    run(['ffmpeg', '-y',
         '-i', final_mixed,
         '-vf', visual_filters,
         '-c:v', 'libx264', '-preset', 'veryfast',
         '-crf', '21', # Slightly better quality
         '-c:a', 'copy',
         output_path])

    print(f"SUCCESS: {output_path}", flush=True)

if __name__ == '__main__':
    main()
