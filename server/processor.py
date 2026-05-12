import sys
import os
import json
import subprocess
import cv2
import whisper
from datetime import datetime
import numpy as np
import shutil
import time

# Initialize OpenCV Face Detection
face_cascade_path = os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_default.xml')
face_cascade = cv2.CascadeClassifier(face_cascade_path)

def log(message):
    print(f"[{datetime.now()}] {message}")
    sys.stdout.flush()

def get_face_center(frame):
    try:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        if len(faces) > 0:
            (x, y, w, h) = faces[0]
            return (x + w / 2) / frame.shape[1]
    except:
        pass
    return 0.5

def get_interesting_segments(video_path, count=3):
    video_duration = 0
    try:
        result = subprocess.run([
            "ffprobe", "-v", "error", "-show_entries", "format=duration", 
            "-of", "default=noprint_wrappers=1:nokey=1", video_path
        ], capture_output=True, text=True)
        video_duration = float(result.stdout.strip())
    except:
        video_duration = 300
    
    intervals = np.linspace(0, max(0, video_duration - 70), num=max(count * 2, 10))
    return intervals.tolist()

def create_ass_file(segments, style_name, output_ass_path, font_size=32, position='center'):
    # styles config
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
    margin_v = 100 if position == 'center' else 320 # Adjust for 720x1280
    
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{s['font']},{font_size},{s['primary']},&H000000FF,{s['outline']},&H00000000,-1,0,0,0,100,100,0,0,1,2,0,{alignment},10,10,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    pop_timestamps = []
    with open(output_ass_path, 'w', encoding='utf-8') as f:
        f.write(header)
        for seg in segments:
            if 'words' in seg:
                words = seg['words']
                # Group into 2-3 words (Viral pacing)
                i = 0
                while i < len(words):
                    chunk_size = 2 if len(words[i]['word']) > 6 else 3
                    chunk = words[i:i+chunk_size]
                    
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
            else:
                f.write(f"Dialogue: 0,{format_timestamp(seg['start'])},{format_timestamp(seg['end'])},Default,,0,0,0,,{seg['text'].strip().upper()}\n")
    return pop_timestamps

def format_timestamp(seconds):
    h, m, s = int(seconds//3600), int((seconds%3600)//60), seconds%60
    return f"{h:01d}:{m:02d}:{s:05.2f}"

def run_ytdlp(base_cmd):
    # Check for cookies.txt in the server directory
    cookies_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cookies.txt")
    
    if os.path.exists(cookies_path):
        log("Trying yt-dlp with cookies.txt...")
        res = subprocess.run(base_cmd + ["--cookies", cookies_path], capture_output=True, text=True)
        if res.returncode == 0: return True
        log(f"yt-dlp (cookies.txt) failed. Output: {res.stderr[-500:]}")

    # Try browsers
    for browser in ['chrome', 'edge', 'firefox', 'brave', 'opera']:
        log(f"Trying yt-dlp with {browser} cookies...")
        res = subprocess.run(base_cmd + ["--cookies-from-browser", browser], capture_output=True, text=True)
        if res.returncode == 0: return True
    
    # Try anonymous
    log("Trying yt-dlp anonymously...")
    res = subprocess.run(base_cmd, capture_output=True, text=True)
    if res.returncode == 0: return True
    
    log(f"yt-dlp anonymous failed. Last output: {res.stderr[-1000:]}")
    raise Exception(f"yt-dlp failed to download. You may be rate-limited by YouTube. {res.stderr[-500:]}")

def process_video(url, style, output_path_base, count=1, font_size=32, position='center'):
    temp_dir = os.path.join(os.getcwd(), f"temp_{int(datetime.now().timestamp())}")
    os.makedirs(temp_dir, exist_ok=True)
    try:
        count, font_size = int(count), int(font_size)
        log(f"Scouting video for {count} clips...")
        temp_audio_full = os.path.join(temp_dir, "full_audio.mp3")
        
        dl_cmd = [sys.executable, "-m", "yt_dlp", "-f", "bestaudio/best", "--download-sections", "*0-600", "-o", temp_audio_full, url]
        run_ytdlp(dl_cmd)

        candidates = get_interesting_segments(temp_audio_full, count)
        model_tiny = whisper.load_model("tiny")
        scored_candidates = []
        for st in candidates:
            sample = os.path.join(temp_dir, f"s_{st}.mp3")
            subprocess.run(["ffmpeg", "-y", "-ss", str(st), "-t", "15", "-i", temp_audio_full, sample], capture_output=True)
            if os.path.exists(sample):
                res = model_tiny.transcribe(sample)
                words = len(res['text'].split())
                scored_candidates.append({'start': st, 'score': words})
        
        scored_candidates.sort(key=lambda x: x['score'], reverse=True)
        best_candidates = scored_candidates[:count]

        model_base = whisper.load_model("base")

        for idx, cand in enumerate(best_candidates):
            best_start = cand['start']
            log(f"Processing clip {idx+1}/{count} at {best_start}s")
            
            clip_id = f"clip_{idx+1}_{int(datetime.now().timestamp())}"
            temp_video, temp_audio = os.path.join(temp_dir, f"{clip_id}_in.mp4"), os.path.join(temp_dir, f"{clip_id}_au.mp3")
            output_ass, tracked = os.path.join(temp_dir, f"{clip_id}_sub.ass"), os.path.join(temp_dir, f"{clip_id}_tr.mp4")
            final_output = output_path_base.replace(".mp4", f"_{idx+1}.mp4") if count > 1 else output_path_base

            dl_video_cmd = [sys.executable, "-m", "yt_dlp", "-f", "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]", "--download-sections", f"*{best_start}-{best_start+60}", "-o", temp_video, "--merge-output-format", "mp4", url]
            
            if idx > 0:
                log("Waiting 10 seconds to avoid YouTube rate limits...")
                time.sleep(10)
                
            run_ytdlp(dl_video_cmd)

            subprocess.run(["ffmpeg", "-y", "-i", temp_video, "-vn", "-acodec", "libmp3lame", temp_audio], check=True)
            log("Transcribing and captioning...")
            res = model_base.transcribe(temp_audio, word_timestamps=True)
            pop_times = create_ass_file(res['segments'], style, output_ass, font_size, position)
            
            # Save the transcript for AI metadata generation
            transcript_path = final_output.replace(".mp4", "_transcript.txt")
            with open(transcript_path, 'w', encoding='utf-8') as f:
                f.write(res['text'].strip())

            log("Tracking faces and cropping (High Quality Mode)...")
            cap = cv2.VideoCapture(temp_video)
            fps, w, h = cap.get(cv2.CAP_PROP_FPS), int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            tw = int(h * 9 / 16)
            if tw % 2 != 0: tw -= 1
            
            # Pipe raw frames to ffmpeg for high-quality encoding instead of cv2.VideoWriter
            ffmpeg_process = subprocess.Popen([
                'ffmpeg', '-y', '-f', 'rawvideo', '-vcodec', 'rawvideo',
                '-s', f'{tw}x{h}', '-pix_fmt', 'bgr24', '-r', str(fps),
                '-i', '-', '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', tracked
            ], stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
            
            sx, target_sx, fc = 0.5, 0.5, 0
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret: break
                
                # Update face center target every 3 frames for performance
                if fc % 3 == 0: 
                    target_sx = get_face_center(frame)
                
                # Smooth interpolation every single frame for buttery smooth tracking
                sx = sx * 0.92 + target_sx * 0.08
                
                cp = int(sx * w)
                l = max(0, min(cp - tw // 2, w - tw))
                if l % 2 != 0: l -= 1
                
                cropped = frame[0:h, l:l+tw]
                if cropped.shape[1] != tw:
                    cropped = cv2.resize(cropped, (tw, h))
                    
                ffmpeg_process.stdin.write(cropped.tobytes())
                fc += 1
                
            cap.release()
            ffmpeg_process.stdin.close()
            ffmpeg_process.wait()

            log("Rendering final video with Cinematic Filters & SFX...")
            e_ass = output_ass.replace('\\', '/').replace(':', '\\:').replace("'", "'\\\\''")
            
            # SFX Pops Removed as requested
            sfx_audio = temp_audio

            # Visual Polish: Subtle Noise + Contrast (Removed Vignette as requested)
            visual_filters = f"ass='{e_ass}',noise=alls=5:allf=t+u,eq=contrast=1.1:saturation=1.2"
            
            subprocess.run(["ffmpeg", "-y", "-i", tracked, "-i", sfx_audio, "-vf", visual_filters, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "21", "-preset", "veryfast", "-c:a", "aac", "-shortest", final_output], check=True)

        log("Done!")
    except Exception as e:
        log(f"ERROR: {e}"); sys.exit(1)
    finally:
        if os.path.exists(temp_dir): shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    url, style, out = sys.argv[1], sys.argv[2], sys.argv[3]
    count = sys.argv[4] if len(sys.argv) > 4 else 1
    font_size = sys.argv[5] if len(sys.argv) > 5 else 32
    position = sys.argv[6] if len(sys.argv) > 6 else 'center'
    process_video(url, style, out, count, font_size, position)
