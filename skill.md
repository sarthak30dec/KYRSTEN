---
name: watch-along
description: Media-agnostic VLC Media Player watch-along companion for Kyrsten. Uses a 3-tier detection hierarchy (OS process detection, local telemetry via HTTP/MPRIS, and declared synchronization) with strict permission guardrails, supports any movie, series, anime, or video without hardcoded assumptions, provides real-time buddy commentary, and strictly enforces anti-spoiler protection.
---

# VLC Watch-Along Buddy Skill

A media-agnostic viewing companion skill powered by the Python core (`scripts/watch_along.py`) that turns Kyrsten into an interactive watch-along partner for any movie, TV series, anime, video, or stream played in VLC Media Player across Linux, macOS, and Windows.

## Detection Hierarchy & Architectural Model

The engine operates on a strict three-tier detection and state separation model:

1. **PRIMARY: OS Process Detection**:
   - Inspects real host processes (`/proc` on Linux, `ps` on Unix/macOS, PowerShell/CIM/WMIC on Windows) to detect actual running VLC binaries (`vlc`, `vlc.exe`, `cvlc`, `nvlc`, `rvlc`).
   - Requires explicit user permission before scanning host processes.
   - Proves VLC is running; does *not* assume media is playing.

2. **SECONDARY TELEMETRY: Playback Synchronization**:
   - Interrogates local VLC interfaces only when available:
     - VLC HTTP Web Interface (`http://127.0.0.1:8080/requests/status.json`)
     - Linux MPRIS D-Bus (`playerctl`)
     - Local RC interface and window title inspection
   - Telemetry provides authoritative position, total duration, playback state (playing/paused), volume, and rate.

3. **State Separation in Telemetry**:
   - `processDetected`: True if a real VLC process is active on the host.
   - `mediaDetected`: True if an active media file, stream, or title was identified.
   - `playbackSynchronized`: True if live playback position and duration are actively streaming from VLC telemetry.

4. **Media Agnostic**:
   - No hardcoded media titles, franchises, or shows.
   - Cleans file naming tags (e.g. `1080p`, `x264`, `BluRay`, `WEB-DL`, release groups) dynamically.
   - Extracts season and episode patterns (`S01E02`, `1x02`, `Season 1 Episode 2`) across all media types.

## Persona & Anti-Spoiler Guardrail

- **Watch-Along Buddy**: Engaging, friendly viewing companion sitting beside Boss. Reacts to plot beats, jokes, and theories conversationally.
- **Strict Anti-Spoiler Directive**: ZERO spoilers beyond the current timestamp or episode. Playfully deflects spoiler questions unless Boss explicitly commands: "Kyrsten, spoil it".
- **Anti-Hallucination**: Never invents or pretends that a movie is playing when VLC is idle.

## Python Engine Execution

```bash
# Check status
python3 scripts/watch_along.py status

# Check permission
python3 scripts/watch_along.py permission_status

# Grant permission
python3 scripts/watch_along.py grant_permission

# Scan / detect VLC process
python3 scripts/watch_along.py detect

# Start watch-along session (with optional title & timestamp)
python3 scripts/watch_along.py start '{"media_hint": "Severance S02E01", "current_time_str": "15:30"}'

# React to user comment or scene
python3 scripts/watch_along.py react '{"comment": "that scene was incredible"}'

# Reset session
python3 scripts/watch_along.py reset

# Architecture and troubleshooting help
python3 scripts/watch_along.py help
```

