#!/usr/bin/env python3
import sys
import os
import subprocess
import json
import re

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

def main():
    if len(sys.argv) < 5:
        print("Usage: scout_renderer.py <recording_mp4> <audio_mp3> <output_mp4> <script_text>", file=sys.stderr)
        sys.exit(1)

    recording_path = sys.argv[1]
    audio_path     = sys.argv[2]
    output_path    = sys.argv[3]
    script_text    = sys.argv[4]

    audio_dur = get_duration(audio_path)
    video_dur = get_duration(recording_path)

    print(f"Audio: {audio_dur}s, Video: {video_dur}s")

    # 1. Prepare video (scale and loop if shorter than audio)
    # We'll use a complex filter to add captions and transitions
    # For now, let's keep it simple: scale, overlay audio, add simple captions
    
    # We'll use the 'drawtext' filter for captions
    safe_text = re.sub(r"['\n\r]", ' ', script_text[:100])
    caption_filter = f"drawtext=text='{safe_text}':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=h-100:box=1:boxcolor=black@0.5:boxborderw=10"

    # If video is shorter than audio, loop it. If longer, trim it.
    loop_cmd = []
    if video_dur < audio_dur:
        loop_cmd = ['-stream_loop', '-1']

    cmd = ['ffmpeg', '-y'] + loop_cmd + [
        '-i', recording_path,
        '-i', audio_path,
        '-filter_complex', f"[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,{caption_filter}[v]",
        '-map', '[v]', '-map', '1:a',
        '-t', str(audio_dur),
        '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '192k',
        output_path
    ]

    run(cmd)
    print(f"Scout video rendered: {output_path}")

if __name__ == '__main__':
    main()
