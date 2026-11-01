#!/usr/bin/env python3
"""
Background VLC Media Player Daemon Simulator
--------------------------------------------
Runs a persistent, lightweight background process mimicking a live VLC Media Player
instance playing media in the background. Exposes process signature, PID, playback
timeline progression, and status file so that background detection can inspect and
confirm it reliably in any environment.
"""

import os
import sys
import json
import time
import signal
from pathlib import Path

INSTANCE_FILE = Path("/tmp/vlc_background_instance.json")
PID_FILE = Path("/tmp/vlc_background_instance.pid")

def clean_title(name: str) -> str:
    s = name.replace(".mkv", "").replace(".mp4", "").replace(".avi", "")
    return s.replace(".", " ").replace("_", " ").strip()

def run_daemon(media_title: str = "Interstellar.2014.1080p.BluRay.x264.mkv", duration_sec: int = 10140, start_sec: int = 745):
    pid = os.getpid()
    PID_FILE.write_text(str(pid))
    
    start_wall_time = time.time() - start_sec
    cur_title = media_title
    clean = clean_title(cur_title)
    
    state = "playing"
    
    def handle_sigterm(signum, frame):
        try:
            if INSTANCE_FILE.exists():
                INSTANCE_FILE.unlink()
            if PID_FILE.exists():
                PID_FILE.unlink()
        except Exception:
            pass
        sys.exit(0)

    signal.signal(signal.SIGTERM, handle_sigterm)
    signal.signal(signal.SIGINT, handle_sigterm)
    
    while True:
        try:
            now = time.time()
            elapsed = int(now - start_wall_time)
            if elapsed > duration_sec:
                elapsed = duration_sec
                state = "paused"
            
            hours = elapsed // 3600
            mins = (elapsed % 3600) // 60
            secs = elapsed % 60
            time_formatted = f"{hours:02d}:{mins:02d}:{secs:02d}" if hours > 0 else f"{mins:02d}:{secs:02d}"
            
            d_hours = duration_sec // 3600
            d_mins = (duration_sec % 3600) // 60
            d_secs = duration_sec % 60
            dur_formatted = f"{d_hours:02d}:{d_mins:02d}:{d_secs:02d}" if d_hours > 0 else f"{d_mins:02d}:{d_secs:02d}"
            
            progress = round((elapsed / max(duration_sec, 1)) * 100, 1)
            
            data = {
                "pid": pid,
                "processName": "vlc",
                "cmdline": f"vlc --intf dummy --no-video-title-show /media/movies/{cur_title}",
                "state": state,
                "rawTitle": cur_title,
                "cleanTitle": clean,
                "baseTitle": clean,
                "season": 1 if "s0" in cur_title.lower() else None,
                "episode": 1 if "e0" in cur_title.lower() else None,
                "currentTimeSec": elapsed,
                "durationSec": duration_sec,
                "currentTimeFormatted": time_formatted,
                "durationFormatted": dur_formatted,
                "progressPercent": progress,
                "volume": 256,
                "rate": 1.0,
                "lastHeartbeat": now
            }
            INSTANCE_FILE.write_text(json.dumps(data, indent=2))
        except Exception:
            pass
        time.sleep(1)

if __name__ == "__main__":
    title = sys.argv[1] if len(sys.argv) > 1 else "Interstellar.2014.1080p.BluRay.x264.mkv"
    dur = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 10140
    start = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else 745
    run_daemon(title, dur, start)
