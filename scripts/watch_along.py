#!/usr/bin/env python3
"""
KYRSTEN VLC WATCH-ALONG ENGINE
==============================

Media-agnostic VLC detection and watch-along synchronization engine.

Design goals:
    1. Detect a REAL VLC process running on the host machine.
    2. Do not require VLC's HTTP interface merely to detect VLC.
    3. Use local VLC interfaces only when available for playback telemetry.
    4. Never pretend that process detection means media is playing.
    5. Support movies, TV episodes, anime, videos, music, streams,
       playlists, and arbitrary media filenames.
    6. Work across Linux/macOS/Windows where the host environment permits.
    7. Maintain a lightweight synchronization estimate between polls.
    8. Enforce explicit permission before background process inspection.
    9. Avoid hardcoded media titles or franchises.
    10. Return structured JSON suitable for an AI/agent skill.

Detection hierarchy
-------------------

PRIMARY:
    OS process inspection.

SECONDARY TELEMETRY:
    VLC HTTP interface, if enabled.
    Linux MPRIS/playerctl, if available.
    VLC RC interface, if available.
    Window title inspection.

IMPORTANT:
    Finding VLC.exe/vlc/cvlc/etc. proves that VLC is running.
    It does NOT prove:
        - a video is playing
        - VLC is not paused
        - which media is active
        - the current timestamp

Therefore the returned state distinguishes:

    processDetected
    mediaDetected
    playbackSynchronized

from one another.

No media titles, shows, movies, or franchises are hardcoded.
"""

from __future__ import annotations

import base64
import json
import os
import platform
import re
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SESSION_FILE = Path(
    os.environ.get(
        "KYRSTEN_VLC_SESSION_FILE",
        str(Path.home() / ".kyrsten_vlc_session.json"),
    )
)

# HTTP is OPTIONAL telemetry, never the primary detection mechanism.
VLC_HTTP_HOST = os.environ.get("VLC_HTTP_HOST", "127.0.0.1")
VLC_HTTP_PORT = int(os.environ.get("VLC_HTTP_PORT", "8080"))

VLC_HTTP_BASE = (
    f"http://{VLC_HTTP_HOST}:{VLC_HTTP_PORT}"
)

HTTP_TIMEOUT = float(os.environ.get("KYRSTEN_VLC_HTTP_TIMEOUT", "0.8"))
PROCESS_TIMEOUT = float(os.environ.get("KYRSTEN_VLC_PROCESS_TIMEOUT", "1.5"))

# Common VLC executable names.
# These are executable identities, not media-specific hardcoding.
VLC_EXECUTABLE_NAMES = {
    "vlc",
    "vlc.exe",
    "cvlc",
    "cvlc.exe",
    "nvlc",
    "nvlc.exe",
    "rvlc",
    "rvlc.exe",
}

MEDIA_EXTENSIONS = {
    ".mp4",
    ".mkv",
    ".avi",
    ".mov",
    ".wmv",
    ".webm",
    ".m4v",
    ".flv",
    ".ts",
    ".m2ts",
    ".mts",
    ".3gp",
    ".3g2",
    ".ogv",
    ".mpeg",
    ".mpg",
    ".vob",
    ".divx",
    ".asf",
    ".rm",
    ".rmvb",
    ".mxf",
    ".ogm",
    ".mp3",
    ".flac",
    ".wav",
    ".aac",
    ".ogg",
    ".oga",
    ".opus",
    ".m4a",
    ".wma",
}

# ---------------------------------------------------------------------------
# Generic utilities
# ---------------------------------------------------------------------------


def now() -> float:
    return time.time()


def safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def format_time_seconds(seconds: float) -> str:
    """
    Format seconds as HH:MM:SS or MM:SS.
    """
    seconds = max(0, int(round(seconds)))

    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60

    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"

    return f"{minutes:02d}:{secs:02d}"


def parse_time_string(value: Optional[str]) -> Optional[int]:
    """
    Parse:
        MM:SS
        HH:MM:SS
        seconds

    Returns None for invalid input.
    """
    if value is None:
        return None

    value = str(value).strip()

    if not value:
        return None

    if value.isdigit():
        return int(value)

    parts = value.split(":")

    if not all(part.isdigit() for part in parts):
        return None

    try:
        numbers = [int(part) for part in parts]

        if len(numbers) == 2:
            minutes, seconds = numbers

            if seconds >= 60:
                return None

            return minutes * 60 + seconds

        if len(numbers) == 3:
            hours, minutes, seconds = numbers

            if minutes >= 60 or seconds >= 60:
                return None

            return hours * 3600 + minutes * 60 + seconds

    except Exception:
        return None

    return None


def calculate_progress(position: float, duration: float) -> float:
    if duration <= 0:
        return 0.0

    return round(
        max(0.0, min(100.0, (position / duration) * 100.0)),
        1,
    )


# ---------------------------------------------------------------------------
# Media title handling
# ---------------------------------------------------------------------------


def clean_media_title(raw_title: str) -> Dict[str, Any]:
    """
    Generic media-title cleaner.

    Does NOT contain knowledge of any particular movie/show.

    Attempts to extract:
        - base title
        - season
        - episode

    Supports common patterns such as:
        Show.S01E02
        Show S01E02
        Show 1x02
        Show Season 1 Episode 2

    Everything else remains generic.
    """

    if not raw_title:
        return {
            "cleanTitle": "Unknown Media",
            "baseTitle": "Unknown Media",
            "raw": "",
            "season": None,
            "episode": None,
        }

    original = str(raw_title).strip()

    # Remove URI/file prefixes where practical.
    title = original

    if "://" in title:
        title = title.rstrip("/").split("/")[-1]

    # Decode a basic file URL representation.
    title = title.replace("%20", " ")

    # Remove extension.
    suffix = Path(title).suffix.lower()

    if suffix in MEDIA_EXTENSIONS:
        title = title[: -len(suffix)]

    # Extract S01E02 / S1E2 / S01.E02 / S01-E02.
    season = None
    episode = None

    patterns = [
        r"\bS(\d{1,3})\s*[\.\-_ ]?\s*E(\d{1,3})\b",
        r"\bSeason\s*(\d{1,3})\s*Episode\s*(\d{1,3})\b",
        r"\b(\d{1,3})x(\d{1,3})\b",
    ]

    for pattern in patterns:
        match = re.search(
            pattern,
            title,
            flags=re.IGNORECASE,
        )

        if match:
            season = int(match.group(1))
            episode = int(match.group(2))
            break

    # Remove common technical/release tags.
    technical_tags = [
        r"\b\d{3,4}p\b",
        r"\b2160p\b",
        r"\b4K\b",
        r"\b8K\b",
        r"\bUHD\b",
        r"\bFHD\b",
        r"\bHDR\b",
        r"\bHDR10\b",
        r"\bDV\b",
        r"\bDolbyVision\b",
        r"\bBluRay\b",
        r"\bBlu-Ray\b",
        r"\bWEB[-\. ]?DL\b",
        r"\bWEBRip\b",
        r"\bHDTV\b",
        r"\bREMUX\b",
        r"\bREPACK\b",
        r"\bPROPER\b",
        r"\bLIMITED\b",
        r"\bIMAX\b",
        r"\bx264\b",
        r"\bx265\b",
        r"\bH\.?264\b",
        r"\bH\.?265\b",
        r"\bHEVC\b",
        r"\bAVC\b",
        r"\bAAC\b",
        r"\bAC3\b",
        r"\bEAC3\b",
        r"\bDTS\b",
        r"\bTRUEHD\b",
        r"\bAtmos\b",
        r"\b10bit\b",
        r"\b8bit\b",
    ]

    cleaned = title

    for pattern in technical_tags:
        cleaned = re.sub(
            pattern,
            " ",
            cleaned,
            flags=re.IGNORECASE,
        )

    # Remove explicit season/episode marker from display title.
    cleaned = re.sub(
        r"\bS\d{1,3}\s*[\.\-_ ]?\s*E\d{1,3}\b",
        " ",
        cleaned,
        flags=re.IGNORECASE,
    )

    cleaned = re.sub(
        r"\bSeason\s*\d{1,3}\s*Episode\s*\d{1,3}\b",
        " ",
        cleaned,
        flags=re.IGNORECASE,
    )

    cleaned = re.sub(
        r"\b\d{1,3}x\d{1,3}\b",
        " ",
        cleaned,
        flags=re.IGNORECASE,
    )

    # Replace release separators.
    cleaned = cleaned.replace(".", " ")
    cleaned = cleaned.replace("_", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" -._")

    # Remove trailing year only if it looks like a standalone year.
    # This is intentionally conservative.
    cleaned = re.sub(
        r"\s+\[(?:19|20)\d{2}\]$",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )

    display_title = cleaned or title or "Unknown Media"

    formatted_title = display_title

    if season is not None and episode is not None:
        formatted_title = (
            f"{display_title} "
            f"(Season {season}, Episode {episode})"
        )

    return {
        "cleanTitle": formatted_title,
        "baseTitle": display_title,
        "raw": original,
        "season": season,
        "episode": episode,
    }


# ---------------------------------------------------------------------------
# Process detection
# ---------------------------------------------------------------------------


def executable_name_from_command(command: str) -> str:
    """
    Extract the executable basename from a command/path.
    """
    command = (command or "").strip().strip('"').strip("'")

    if not command:
        return ""

    basename = os.path.basename(command)

    return basename.lower()


def looks_like_vlc_executable(executable: str, command_line: str = "") -> bool:
    """
    Determine whether an executable/command line represents VLC.

    No media-specific assumptions are made.
    """

    exe = executable_name_from_command(executable)

    if exe in VLC_EXECUTABLE_NAMES:
        return True

    command_line = (command_line or "").strip()

    if not command_line:
        return False

    first_token = command_line.split()[0].strip('"').strip("'")
    first_name = executable_name_from_command(first_token)

    if first_name in VLC_EXECUTABLE_NAMES:
        return True

    return False


def get_linux_processes() -> List[Dict[str, Any]]:
    """
    Enumerate Linux processes using /proc.

    This is the primary Linux process detector.
    """

    processes: List[Dict[str, Any]] = []

    proc_root = Path("/proc")

    if not proc_root.exists():
        return processes

    for entry in proc_root.iterdir():
        if not entry.name.isdigit():
            continue

        pid = int(entry.name)

        try:
            comm_path = entry / "comm"
            cmdline_path = entry / "cmdline"

            comm = (
                comm_path.read_text(
                    encoding="utf-8",
                    errors="ignore",
                ).strip()
                if comm_path.exists()
                else ""
            )

            cmdline_raw = (
                cmdline_path.read_bytes()
                if cmdline_path.exists()
                else b""
            )

            cmdline = (
                cmdline_raw
                .replace(b"\x00", b" ")
                .decode(
                    "utf-8",
                    errors="ignore",
                )
                .strip()
            )

            if pid == os.getpid():
                continue

            if looks_like_vlc_executable(comm, cmdline):
                processes.append(
                    {
                        "pid": pid,
                        "comm": comm,
                        "cmdline": cmdline,
                        "user": None,
                        "platform": "linux",
                    }
                )

        except (PermissionError, FileNotFoundError, ProcessLookupError):
            continue
        except Exception:
            continue

    return processes


def get_ps_processes() -> List[Dict[str, Any]]:
    """
    Generic process enumeration using ps.

    Useful on Unix systems where /proc is unavailable.
    """

    if not shutil.which("ps"):
        return []

    try:
        result = subprocess.run(
            ["ps", "-eo", "pid=,user=,comm=,args="],
            capture_output=True,
            text=True,
            timeout=PROCESS_TIMEOUT,
        )

        if result.returncode != 0:
            return []

        processes: List[Dict[str, Any]] = []

        for line in result.stdout.splitlines():
            line = line.strip()

            if not line:
                continue

            match = re.match(
                r"^(\d+)\s+(\S+)\s+(\S+)\s+(.*)$",
                line,
            )

            if not match:
                continue

            pid = int(match.group(1))
            user = match.group(2)
            comm = match.group(3)
            args = match.group(4)

            if pid == os.getpid():
                continue

            if looks_like_vlc_executable(comm, args):
                processes.append(
                    {
                        "pid": pid,
                        "user": user,
                        "comm": comm,
                        "cmdline": args,
                        "platform": platform.system().lower(),
                    }
                )

        return processes

    except Exception:
        return []


def get_windows_processes() -> List[Dict[str, Any]]:
    """
    Windows process enumeration.

    Uses PowerShell or WMIC when available.
    """

    processes: List[Dict[str, Any]] = []

    powershell = shutil.which("powershell") or shutil.which("pwsh")

    if powershell:
        try:
            command = [
                powershell,
                "-NoProfile",
                "-Command",
                (
                    "Get-CimInstance Win32_Process "
                    "| Select-Object ProcessId,Name,CommandLine "
                    "| ConvertTo-Json -Compress"
                ),
            ]

            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=PROCESS_TIMEOUT,
            )

            if result.returncode == 0 and result.stdout.strip():
                data = json.loads(result.stdout)

                if isinstance(data, dict):
                    data = [data]

                for item in data:
                    name = str(item.get("Name") or "")
                    command_line = str(
                        item.get("CommandLine") or ""
                    )

                    if looks_like_vlc_executable(
                        name,
                        command_line,
                    ):
                        processes.append(
                            {
                                "pid": safe_int(
                                    item.get("ProcessId")
                                ),
                                "comm": name,
                                "cmdline": command_line,
                                "user": None,
                                "platform": "windows",
                            }
                        )

                return processes

        except Exception:
            pass

    # WMIC fallback for older Windows installations.
    wmic = shutil.which("wmic")

    if wmic:
        try:
            result = subprocess.run(
                [
                    wmic,
                    "process",
                    "get",
                    "ProcessId,Name,CommandLine",
                    "/format:csv",
                ],
                capture_output=True,
                text=True,
                timeout=PROCESS_TIMEOUT,
            )

            if result.returncode == 0:
                for line in result.stdout.splitlines():
                    if "VLC" not in line.upper():
                        continue

                    fields = line.split(",")

                    if len(fields) < 4:
                        continue

                    name = fields[-2]
                    pid = safe_int(fields[-1])
                    command_line = ",".join(fields[1:-2])

                    if looks_like_vlc_executable(
                        name,
                        command_line,
                    ):
                        processes.append(
                            {
                                "pid": pid,
                                "comm": name,
                                "cmdline": command_line,
                                "user": None,
                                "platform": "windows",
                            }
                        )

        except Exception:
            pass

    return processes


def detect_vlc_processes() -> List[Dict[str, Any]]:
    """
    Detect actual VLC processes.

    This function does NOT contact VLC's HTTP interface.
    """

    system = platform.system().lower()

    if system == "windows":
        processes = get_windows_processes()

        if processes:
            return processes

        return []

    if system == "linux":
        processes = get_linux_processes()

        if processes:
            return processes

    return get_ps_processes()


def extract_media_argument(command_line: str) -> Optional[str]:
    """
    Attempts to identify a media argument from VLC's command line.

    This is only a fallback hint.

    It does NOT assume that every VLC invocation contains a filename.
    """

    if not command_line:
        return None

    # Quoted paths / URLs.
    quoted = re.findall(
        r'"([^"]+)"|\'([^\']+)\'',
        command_line,
    )

    candidates: List[str] = []

    for first, second in quoted:
        candidate = first or second

        if candidate:
            candidates.append(candidate)

    # Non-quoted tokens.
    candidates.extend(command_line.split())

    for candidate in candidates:
        candidate = candidate.strip()

        if not candidate:
            continue

        # Skip command switches.
        if candidate.startswith("-"):
            continue

        suffix = Path(candidate).suffix.lower()

        if suffix in MEDIA_EXTENSIONS:
            return candidate

        # Network streams.
        if "://" in candidate:
            return candidate

    return None


def process_detection_result(
    processes: List[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """
    Convert raw process information into unified VLC detection data.
    """

    if not processes:
        return None

    process = processes[0]

    pid = safe_int(process.get("pid"))

    media_hint = extract_media_argument(
        str(process.get("cmdline") or "")
    )

    media_info = clean_media_title(
        media_hint or ""
    )

    return {
        "connected": True,
        "processDetected": True,
        "mediaDetected": bool(media_hint),
        "playbackSynchronized": False,

        "interface": "os_process",
        "source": "os_process",

        "pid": pid,
        "comm": process.get("comm"),
        "cmdline": process.get("cmdline"),
        "user": process.get("user"),

        "state": "unknown",

        "rawTitle": (
            media_hint
            if media_hint
            else None
        ),

        "cleanTitle": (
            media_info["cleanTitle"]
            if media_hint
            else None
        ),

        "baseTitle": (
            media_info["baseTitle"]
            if media_hint
            else None
        ),

        "season": media_info["season"],
        "episode": media_info["episode"],

        "currentTimeSec": None,
        "durationSec": None,

        "currentTimeFormatted": None,
        "durationFormatted": None,

        "progressPercent": None,

        "rate": None,
        "volume": None,

        "detectedAt": now(),
    }


# ---------------------------------------------------------------------------
# VLC HTTP telemetry
# ---------------------------------------------------------------------------


def inspect_vlc_http() -> Optional[Dict[str, Any]]:
    """
    Query VLC's local HTTP interface for authoritative telemetry.

    IMPORTANT:
        This function is NOT used to determine whether VLC exists.

    Process detection happens separately.
    """

    url = (
        f"{VLC_HTTP_BASE}"
        "/requests/status.json"
    )

    password = os.environ.get(
        "VLC_PASSWORD",
        "",
    )

    passwords = []

    for candidate in [
        password,
        "vlc",
        "",
    ]:
        if candidate not in passwords:
            passwords.append(candidate)

    for pwd in passwords:
        try:
            credentials = f":{pwd}".encode("utf-8")

            auth = base64.b64encode(
                credentials
            ).decode("ascii")

            request = urllib.request.Request(
                url,
                headers={
                    "Authorization": f"Basic {auth}"
                },
            )

            with urllib.request.urlopen(
                request,
                timeout=HTTP_TIMEOUT,
            ) as response:

                if response.status != 200:
                    continue

                raw = response.read()

                data = json.loads(
                    raw.decode(
                        "utf-8",
                        errors="replace",
                    )
                )

                state = str(
                    data.get(
                        "state",
                        "unknown",
                    )
                ).lower()

                current = safe_float(
                    data.get("time"),
                    0.0,
                )

                duration = safe_float(
                    data.get("length"),
                    0.0,
                )

                rate = safe_float(
                    data.get("rate"),
                    1.0,
                )

                volume = safe_float(
                    data.get("volume"),
                    0.0,
                )

                information = data.get(
                    "information",
                    {},
                )

                category = (
                    information.get(
                        "category",
                        {},
                    )
                    if isinstance(
                        information,
                        dict,
                    )
                    else {}
                )

                meta = (
                    category.get(
                        "meta",
                        {},
                    )
                    if isinstance(
                        category,
                        dict,
                    )
                    else {}
                )

                if not isinstance(meta, dict):
                    meta = {}

                raw_title = (
                    meta.get("title")
                    or meta.get("filename")
                    or data.get("title")
                    or data.get("filename")
                    or ""
                )

                if not raw_title:
                    # VLC may expose the input through other fields.
                    raw_title = (
                        data.get("input")
                        or ""
                    )

                cleaned = clean_media_title(
                    str(raw_title)
                )

                return {
                    "connected": True,

                    "processDetected": False,
                    "mediaDetected": bool(raw_title),
                    "playbackSynchronized": True,

                    "interface": "vlc_http_api",
                    "source": "vlc_http_json",

                    "state": state,

                    "rawTitle": str(raw_title)
                    if raw_title
                    else None,

                    "cleanTitle": (
                        cleaned["cleanTitle"]
                        if raw_title
                        else None
                    ),

                    "baseTitle": (
                        cleaned["baseTitle"]
                        if raw_title
                        else None
                    ),

                    "season": cleaned["season"],
                    "episode": cleaned["episode"],

                    "currentTimeSec": current,
                    "durationSec": duration,

                    "currentTimeFormatted":
                        format_time_seconds(current),

                    "durationFormatted":
                        format_time_seconds(duration),

                    "progressPercent":
                        calculate_progress(
                            current,
                            duration,
                        ),

                    "rate": rate,
                    "volume": volume,

                    "sampledAt": now(),
                }

        except (
            urllib.error.URLError,
            urllib.error.HTTPError,
            TimeoutError,
            ConnectionError,
            json.JSONDecodeError,
            OSError,
        ):
            continue

        except Exception:
            continue

    return None


# ---------------------------------------------------------------------------
# Linux MPRIS telemetry
# ---------------------------------------------------------------------------


def inspect_vlc_mpris() -> Optional[Dict[str, Any]]:
    """
    Query VLC through playerctl if available.

    This is telemetry only.
    """

    playerctl = shutil.which("playerctl")

    if not playerctl:
        return None

    commands = [
        [
            playerctl,
            "-p",
            "vlc",
            "status",
        ],
        [
            playerctl,
            "-p",
            "vlc",
            "metadata",
            "--format",
            (
                "{{status}}|"
                "{{title}}|"
                "{{position}}|"
                "{{mpris:length}}"
            ),
        ],
    ]

    try:
        status_result = subprocess.run(
            commands[0],
            capture_output=True,
            text=True,
            timeout=PROCESS_TIMEOUT,
        )

        if status_result.returncode != 0:
            return None

        state = (
            status_result.stdout.strip()
            .lower()
        )

        metadata_result = subprocess.run(
            commands[1],
            capture_output=True,
            text=True,
            timeout=PROCESS_TIMEOUT,
        )

        if metadata_result.returncode != 0:
            return None

        output = metadata_result.stdout.strip()

        parts = output.split("|")

        raw_title = (
            parts[1].strip()
            if len(parts) > 1
            else ""
        )

        position_us = (
            safe_int(parts[2])
            if len(parts) > 2
            else 0
        )

        duration_us = (
            safe_int(parts[3])
            if len(parts) > 3
            else 0
        )

        current = position_us / 1_000_000
        duration = duration_us / 1_000_000

        cleaned = clean_media_title(
            raw_title
        )

        return {
            "connected": True,

            "processDetected": False,
            "mediaDetected": bool(raw_title),
            "playbackSynchronized": True,

            "interface": "mpris_playerctl",
            "source": "mpris",

            "state": state,

            "rawTitle": raw_title or None,
            "cleanTitle": (
                cleaned["cleanTitle"]
                if raw_title
                else None
            ),
            "baseTitle": (
                cleaned["baseTitle"]
                if raw_title
                else None
            ),

            "season": cleaned["season"],
            "episode": cleaned["episode"],

            "currentTimeSec": current,
            "durationSec": duration,

            "currentTimeFormatted":
                format_time_seconds(current),

            "durationFormatted":
                format_time_seconds(duration),

            "progressPercent":
                calculate_progress(
                    current,
                    duration,
                ),

            "sampledAt": now(),
        }

    except Exception:
        return None


# ---------------------------------------------------------------------------
# Window title telemetry
# ---------------------------------------------------------------------------


def inspect_window_title() -> Optional[Dict[str, Any]]:
    """
    Best-effort window-title detection.

    This does not attempt to control VLC.
    """

    system = platform.system().lower()

    if system == "linux":
        xdotool = shutil.which("xdotool")

        if xdotool:
            try:
                result = subprocess.run(
                    [
                        xdotool,
                        "search",
                        "--name",
                        "VLC",
                        "getwindowname",
                        "%@",
                    ],
                    capture_output=True,
                    text=True,
                    timeout=PROCESS_TIMEOUT,
                )

                if result.returncode == 0:
                    titles = [
                        line.strip()
                        for line
                        in result.stdout.splitlines()
                        if line.strip()
                    ]

                    if titles:
                        title = titles[0]

                        # Remove VLC suffixes where obvious.
                        title = re.sub(
                            r"\s*-\s*VLC media player\s*$",
                            "",
                            title,
                            flags=re.IGNORECASE,
                        ).strip()

                        cleaned = clean_media_title(
                            title
                        )

                        return {
                            "connected": True,
                            "processDetected": True,
                            "mediaDetected": True,
                            "playbackSynchronized": False,
                            "interface": "window_title",
                            "source": "window_title",
                            "state": "unknown",
                            "rawTitle": title,
                            "cleanTitle": cleaned["cleanTitle"],
                            "baseTitle": cleaned["baseTitle"],
                            "season": cleaned["season"],
                            "episode": cleaned["episode"],
                            "currentTimeSec": None,
                            "durationSec": None,
                            "currentTimeFormatted": None,
                            "durationFormatted": None,
                            "progressPercent": None,
                            "sampledAt": now(),
                        }

            except Exception:
                pass

    return None


# ---------------------------------------------------------------------------
# Session management
# ---------------------------------------------------------------------------


def default_session() -> Dict[str, Any]:
    return {
        "active": False,

        "permissionGranted": False,
        "permissionTimestamp": 0,

        "processDetected": False,
        "mediaDetected": False,
        "playbackSynchronized": False,

        "connected": False,

        "interface": "none",
        "source": "none",

        "pid": None,

        "cleanTitle": None,
        "baseTitle": None,
        "rawTitle": None,

        "season": None,
        "episode": None,

        "state": "idle",

        "currentTimeSec": None,
        "durationSec": None,

        "currentTimeFormatted": None,
        "durationFormatted": None,

        "progressPercent": None,

        "rate": 1.0,

        "sampledAt": 0,
        "sessionUpdatedAt": 0,

        "spoilerShield": True,

        "commentsHistory": [],
    }


def load_session() -> Dict[str, Any]:
    if not SESSION_FILE.exists():
        return default_session()

    try:
        data = json.loads(
            SESSION_FILE.read_text(
                encoding="utf-8"
            )
        )

        session = default_session()
        session.update(data)

        return session

    except Exception:
        return default_session()


def save_session(session: Dict[str, Any]) -> None:
    try:
        SESSION_FILE.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        temporary = SESSION_FILE.with_suffix(
            SESSION_FILE.suffix + ".tmp"
        )

        temporary.write_text(
            json.dumps(
                session,
                indent=2,
            ),
            encoding="utf-8",
        )

        temporary.replace(SESSION_FILE)

    except Exception:
        pass


# ---------------------------------------------------------------------------
# Permission
# ---------------------------------------------------------------------------


def check_permission() -> bool:
    session = load_session()

    return bool(
        session.get(
            "permissionGranted",
            False,
        )
    )


def grant_permission() -> Dict[str, Any]:
    session = load_session()

    session["permissionGranted"] = True
    session["permissionTimestamp"] = now()

    save_session(session)

    return session


def revoke_permission() -> Dict[str, Any]:
    session = load_session()

    session["permissionGranted"] = False

    save_session(session)

    return session


# ---------------------------------------------------------------------------
# Synchronization
# ---------------------------------------------------------------------------


def estimate_current_position(
    session: Dict[str, Any]
) -> Optional[float]:
    """
    Estimate current position between authoritative VLC samples.

    If VLC is playing:
        position = sampled position + elapsed * rate

    If paused/stopped:
        position remains at sampled position.

    This is only an estimate. The next authoritative VLC telemetry
    sample replaces it.
    """

    position = session.get(
        "currentTimeSec"
    )

    if position is None:
        return None

    position = safe_float(
        position,
        0.0,
    )

    sampled_at = safe_float(
        session.get(
            "sampledAt",
            0,
        ),
        0,
    )

    if sampled_at <= 0:
        return position

    state = str(
        session.get(
            "state",
            "unknown",
        )
    ).lower()

    rate = safe_float(
        session.get(
            "rate",
            1.0,
        ),
        1.0,
    )

    if state not in {
        "playing",
        "playing ",
    }:
        return position

    elapsed = max(
        0.0,
        now() - sampled_at,
    )

    estimated = (
        position
        + elapsed * max(rate, 0.0)
    )

    duration = safe_float(
        session.get(
            "durationSec",
            0,
        ),
        0,
    )

    if duration > 0:
        estimated = min(
            estimated,
            duration,
        )

    return estimated


def apply_live_status(
    session: Dict[str, Any],
    status: Dict[str, Any],
) -> Dict[str, Any]:

    session.update(status)

    session["active"] = True
    session["connected"] = True
    session["sessionUpdatedAt"] = now()

    if status.get(
        "playbackSynchronized"
    ):
        session["sampledAt"] = now()

    save_session(session)

    return session


# ---------------------------------------------------------------------------
# Unified VLC inspection
# ---------------------------------------------------------------------------


def get_vlc_status(
    media_hint: Optional[str] = None,
    current_time_str: Optional[str] = None,
    require_permission: bool = True,
) -> Dict[str, Any]:

    session = load_session()

    # ---------------------------------------------------------------
    # 1. Permission gate.
    # ---------------------------------------------------------------

    if require_permission and not check_permission():
        return {
            "connected": False,
            "processDetected": False,
            "mediaDetected": False,
            "playbackSynchronized": False,

            "interface": "permission_required",
            "source": "permission",

            "state": "permission_required",

            "cleanTitle": None,
            "baseTitle": None,

            "currentTimeSec": None,
            "durationSec": None,

            "currentTimeFormatted": None,
            "durationFormatted": None,

            "progressPercent": None,

            "sessionActive": False,

            "permissionRequired": True,

            "message": (
                "Permission is required before scanning "
                "the host system for VLC."
            ),
        }

    # ---------------------------------------------------------------
    # 2. PRIMARY: detect VLC process.
    #
    # This is intentionally done BEFORE HTTP/MPRIS.
    # ---------------------------------------------------------------

    processes = detect_vlc_processes()

    process_status = process_detection_result(
        processes
    )

    # ---------------------------------------------------------------
    # 3. OPTIONAL telemetry.
    #
    # HTTP/MPRIS are NOT used to establish process existence.
    # ---------------------------------------------------------------

    telemetry = inspect_vlc_http()

    if telemetry is None:
        telemetry = inspect_vlc_mpris()

    # ---------------------------------------------------------------
    # 4. Merge process detection + telemetry.
    # ---------------------------------------------------------------

    if process_status:

        merged = dict(process_status)

        if telemetry:

            # Process detection remains authoritative for PID.
            merged["processDetected"] = True
            merged["pid"] = process_status.get("pid")
            merged["comm"] = process_status.get("comm")
            merged["cmdline"] = process_status.get("cmdline")

            # Telemetry is authoritative for playback state.
            for key in [
                "state",
                "rawTitle",
                "cleanTitle",
                "baseTitle",
                "season",
                "episode",
                "currentTimeSec",
                "durationSec",
                "currentTimeFormatted",
                "durationFormatted",
                "progressPercent",
                "rate",
                "volume",
                "sampledAt",
            ]:
                if key in telemetry:
                    merged[key] = telemetry[key]

            merged["mediaDetected"] = bool(
                telemetry.get(
                    "mediaDetected"
                )
                or process_status.get(
                    "mediaDetected"
                )
            )

            merged["playbackSynchronized"] = bool(
                telemetry.get(
                    "playbackSynchronized",
                    False,
                )
            )

            merged["connected"] = True

            # Preserve telemetry interface while retaining
            # process information.
            merged["interface"] = (
                telemetry.get(
                    "interface"
                )
            )

            merged["source"] = (
                "process+"
                + str(
                    telemetry.get(
                        "source",
                        "telemetry",
                    )
                )
            )

        # -----------------------------------------------------------
        # No telemetry available.
        #
        # VLC is still genuinely detected as a process.
        # -----------------------------------------------------------

        else:
            merged["connected"] = True
            merged["processDetected"] = True
            merged["playbackSynchronized"] = False

        apply_live_status(
            session,
            merged,
        )

        return {
            **merged,

            "sessionActive": True,

            "estimatedCurrentTimeSec":
                estimate_current_position(
                    session
                ),

            "estimatedCurrentTimeFormatted":
                (
                    format_time_seconds(
                        estimate_current_position(
                            session
                        )
                    )
                    if estimate_current_position(
                        session
                    ) is not None
                    else None
                ),

            "spoilerShield":
                session.get(
                    "spoilerShield",
                    True,
                ),

            "permissionGranted": True,
        }

    # ---------------------------------------------------------------
    # 5. Window title fallback.
    # ---------------------------------------------------------------

    window_status = inspect_window_title()

    if window_status:
        apply_live_status(
            session,
            window_status,
        )

        return {
            **window_status,
            "sessionActive": True,
            "spoilerShield": session.get(
                "spoilerShield",
                True,
            ),
            "permissionGranted": True,
        }

    # ---------------------------------------------------------------
    # 6. Explicit user synchronization.
    #
    # This does not claim VLC was detected.
    # ---------------------------------------------------------------

    if media_hint:

        cleaned = clean_media_title(
            media_hint
        )

        current_seconds = parse_time_string(
            current_time_str
        )

        if current_seconds is None:
            current_seconds = 0

        session.update(
            {
                "active": True,

                "connected": False,

                "processDetected": False,
                "mediaDetected": True,
                "playbackSynchronized": False,

                "interface": "user_declared",
                "source": "user_declared",

                "cleanTitle":
                    cleaned["cleanTitle"],

                "baseTitle":
                    cleaned["baseTitle"],

                "rawTitle":
                    cleaned["raw"],

                "season":
                    cleaned["season"],

                "episode":
                    cleaned["episode"],

                "state": "user_declared",

                "currentTimeSec":
                    current_seconds,

                "durationSec":
                    session.get(
                        "durationSec"
                    ),

                "currentTimeFormatted":
                    format_time_seconds(
                        current_seconds
                    ),

                "durationFormatted":
                    (
                        format_time_seconds(
                            session.get(
                                "durationSec",
                                0,
                            )
                        )
                        if session.get(
                            "durationSec"
                        )
                        else None
                    ),

                "progressPercent":
                    None,

                "sampledAt":
                    now(),
            }
        )

        save_session(session)

        return {
            "connected": False,

            "processDetected": False,
            "mediaDetected": True,
            "playbackSynchronized": False,

            "interface": "user_declared",
            "source": "user_declared",

            "state": "user_declared",

            "cleanTitle":
                cleaned["cleanTitle"],

            "baseTitle":
                cleaned["baseTitle"],

            "rawTitle":
                cleaned["raw"],

            "season":
                cleaned["season"],

            "episode":
                cleaned["episode"],

            "currentTimeSec":
                current_seconds,

            "durationSec":
                session.get(
                    "durationSec"
                ),

            "currentTimeFormatted":
                format_time_seconds(
                    current_seconds
                ),

            "durationFormatted":
                (
                    format_time_seconds(
                        session.get(
                            "durationSec",
                            0,
                        )
                    )
                    if session.get(
                        "durationSec"
                    )
                    else None
                ),

            "progressPercent":
                None,

            "sessionActive": True,

            "spoilerShield": True,

            "permissionGranted": True,

            "message": (
                "Media synchronized from "
                "the user's supplied title and timestamp. "
                "VLC itself was not detected."
            ),
        }

    # ---------------------------------------------------------------
    # 7. Nothing found.
    #
    # IMPORTANT:
    # Do NOT reuse stale session data.
    # ---------------------------------------------------------------

    return {
        "connected": False,

        "processDetected": False,
        "mediaDetected": False,
        "playbackSynchronized": False,

        "interface": "none",
        "source": "none",

        "state": "idle",

        "cleanTitle": None,
        "baseTitle": None,
        "rawTitle": None,

        "season": None,
        "episode": None,

        "currentTimeSec": None,
        "durationSec": None,

        "currentTimeFormatted": None,
        "durationFormatted": None,

        "progressPercent": None,

        "sessionActive": False,

        "spoilerShield":
            session.get(
                "spoilerShield",
                True,
            ),

        "permissionGranted": True,

        "message": (
            "No VLC process was detected on the host system."
        ),
    }


# ---------------------------------------------------------------------------
# Reset
# ---------------------------------------------------------------------------


def reset_session() -> Dict[str, Any]:
    try:
        if SESSION_FILE.exists():
            SESSION_FILE.unlink()
    except Exception:
        pass

    return {
        "success": True,
        "cleared": True,

        "permissionGranted": False,

        "connected": False,

        "processDetected": False,
        "mediaDetected": False,
        "playbackSynchronized": False,

        "interface": "none",
        "source": "none",

        "state": "idle",

        "cleanTitle": None,
        "baseTitle": None,

        "currentTimeFormatted": None,
        "durationFormatted": None,

        "sessionActive": False,

        "text": (
            "VLC watch-along session and permission state "
            "have been reset."
        ),
    }


# ---------------------------------------------------------------------------
# Generic reactions
# ---------------------------------------------------------------------------


def generate_buddy_reaction(
    comment: str,
    vlc_status: Dict[str, Any],
    allow_spoilers: bool = False,
) -> Dict[str, Any]:

    title = (
        vlc_status.get(
            "cleanTitle"
        )
        or "what we're watching"
    )

    current_time = (
        vlc_status.get(
            "estimatedCurrentTimeFormatted"
        )
        or vlc_status.get(
            "currentTimeFormatted"
        )
        or "the current scene"
    )

    normalized = (
        comment or ""
    ).lower().strip()

    spoiler_patterns = [
        "does he die",
        "does she die",
        "does it die",
        "who dies",
        "what happens next",
        "who is the killer",
        "what's the twist",
        "what is the twist",
        "tell me the ending",
        "how does it end",
        "spoil it",
        "is he evil",
        "is she evil",
        "who is the traitor",
        "is he the traitor",
        "is she the traitor",
    ]

    is_spoiler = any(
        pattern in normalized
        for pattern in spoiler_patterns
    )

    if is_spoiler and not allow_spoilers:
        text = (
            "Haha, nice try, Boss. My lips are sealed. "
            "I'm not spoiling anything ahead of where "
            "we are. Let's see it unfold."
        )

        return {
            "text": text,
            "spoilerShieldTriggered": True,
            "cleanTitle": title,
            "currentTime": current_time,
            "vlcStatus": vlc_status,
            "vibe": "playful_suspense",
        }

    humor_patterns = [
        "haha",
        "lol",
        "lmao",
        "funny",
        "hilarious",
        "died laughing",
        "crack up",
    ]

    if any(
        pattern in normalized
        for pattern in humor_patterns
    ):
        text = (
            "Haha, right?! That was ridiculous. "
            "I would've lost it at that moment too."
        )

        return {
            "text": text,
            "cleanTitle": title,
            "currentTime": current_time,
            "vlcStatus": vlc_status,
            "vibe": "laughing",
        }

    theory_patterns = [
        "i think",
        "maybe",
        "what if",
        "bet you",
        "my theory",
        "theory",
    ]

    if any(
        pattern in normalized
        for pattern in theory_patterns
    ):
        text = (
            "Ooh, that's an interesting theory. "
            "I'm not confirming or denying anything, "
            "but I'm definitely watching this differently now."
        )

        return {
            "text": text,
            "cleanTitle": title,
            "currentTime": current_time,
            "vlcStatus": vlc_status,
            "vibe": "engaged_companion",
        }

    text = (
        "Right there with you, Boss. "
        "That scene is getting interesting."
    )

    return {
        "text": text,
        "cleanTitle": title,
        "currentTime": current_time,
        "vlcStatus": vlc_status,
        "vibe": "buddy_companion",
    }


# ---------------------------------------------------------------------------
# Main CLI
# ---------------------------------------------------------------------------


def main() -> None:

    if len(sys.argv) < 2:
        print(
            json.dumps(
                {
                    "success": False,
                    "error": (
                        "Action required. "
                        "Available actions: "
                        "status, detect, start, react, "
                        "trivia, permission_status, "
                        "grant_permission, revoke_permission, reset."
                    ),
                }
            )
        )
        return

    action = (
        sys.argv[1]
        .lower()
        .strip()
    )

    payload: Dict[str, Any] = {}

    if len(sys.argv) > 2:

        raw_payload = sys.argv[2]

        try:
            payload = json.loads(
                raw_payload
            )

            if not isinstance(
                payload,
                dict,
            ):
                payload = {}

        except Exception:
            payload = {
                "comment": raw_payload
            }

    media_hint = (
        payload.get("media_hint")
        or payload.get("title")
        or payload.get("media")
    )

    current_time_str = (
        payload.get("current_time_str")
        or payload.get("time")
    )

    comment = (
        payload.get("comment")
        or payload.get("message")
        or ""
    )

    allow_spoilers = bool(
        payload.get(
            "allow_spoilers",
            False,
        )
    )

    # ---------------------------------------------------------------
    # Permission status
    # ---------------------------------------------------------------

    if action in {
        "permission_status",
        "check_permission",
    }:

        granted = check_permission()

        print(
            json.dumps(
                {
                    "success": True,
                    "permissionGranted": granted,
                    "text": (
                        "VLC background process detection "
                        "permission is granted."
                        if granted
                        else
                        "Permission is required before "
                        "scanning the host for VLC."
                    ),
                }
            )
        )

        return

    # ---------------------------------------------------------------
    # Grant permission
    # ---------------------------------------------------------------

    if action in {
        "grant_permission",
        "allow_permission",
        "approve_permission",
    }:

        grant_permission()

        status = get_vlc_status(
            media_hint=media_hint,
            current_time_str=current_time_str,
            require_permission=True,
        )

        detected = bool(
            status.get(
                "processDetected"
            )
        )

        print(
            json.dumps(
                {
                    "success": True,

                    "permissionGranted": True,

                    "detected": detected,

                    "vlc": status,

                    "text": (
                        "Permission granted. "
                        "VLC is running on the host system."
                        if detected
                        else
                        "Permission granted, but no VLC "
                        "process is currently detected."
                    ),

                    "action": "grant_permission",
                }
            )
        )

        return

    # ---------------------------------------------------------------
    # Revoke permission
    # ---------------------------------------------------------------

    if action in {
        "revoke_permission",
        "deny_permission",
    }:

        revoke_permission()

        print(
            json.dumps(
                {
                    "success": True,
                    "permissionGranted": False,
                    "text": (
                        "VLC background process detection "
                        "permission has been revoked."
                    ),
                    "action": "revoke_permission",
                }
            )
        )

        return

    # ---------------------------------------------------------------
    # Detect / scan
    # ---------------------------------------------------------------

    if action in {
        "detect",
        "scan",
        "check_background",
        "detect_vlc",
    }:

        if not check_permission():

            print(
                json.dumps(
                    {
                        "success": True,

                        "permissionRequired": True,

                        "permissionGranted": False,

                        "detected": False,

                        "text": (
                            "Before I scan the host system "
                            "for VLC, permission is required."
                        ),

                        "action": "detect",
                    }
                )
            )

            return

        status = get_vlc_status(
            media_hint=media_hint,
            current_time_str=current_time_str,
            require_permission=True,
        )

        detected = bool(
            status.get(
                "processDetected"
            )
        )

        print(
            json.dumps(
                {
                    "success": True,

                    "permissionRequired": False,

                    "permissionGranted": True,

                    "detected": detected,

                    "vlc": status if detected else None,

                    "text": (
                        "VLC Media Player is running "
                        "on the host system."
                        if detected
                        else
                        "No VLC Media Player process "
                        "was detected on the host system."
                    ),

                    "action": "detect",
                }
            )
        )

        return

    # ---------------------------------------------------------------
    # Status
    # ---------------------------------------------------------------

    if action in {
        "status",
        "check_status",
        "inspect",
    }:

        status = get_vlc_status(
            media_hint=media_hint,
            current_time_str=current_time_str,
            require_permission=True,
        )

        print(
            json.dumps(
                {
                    "success": True,

                    "action": action,

                    "vlc": status,

                    "permissionGranted":
                        check_permission(),
                }
            )
        )

        return

    # ---------------------------------------------------------------
    # Start watch-along
    # ---------------------------------------------------------------

    if action in {
        "start",
        "watch_along",
        "init",
    }:

        if not check_permission() and not media_hint:

            print(
                json.dumps(
                    {
                        "success": True,

                        "permissionRequired": True,

                        "permissionGranted": False,

                        "detected": False,

                        "text": (
                            "Before I detect VLC running "
                            "in the background, I need "
                            "permission to scan the host."
                        ),

                        "action": "start",
                    }
                )
            )

            return

        status = get_vlc_status(
            media_hint=media_hint,
            current_time_str=current_time_str,
            require_permission=not bool(
                media_hint
            ),
        )

        if status.get(
            "processDetected"
        ):

            if status.get(
                "playbackSynchronized"
            ):

                message = (
                    "I found VLC running on the host "
                    "and synchronized with its current "
                    "playback state."
                )

            else:

                message = (
                    "I found VLC running on the host. "
                    "VLC's playback interface isn't "
                    "currently available, so I can confirm "
                    "VLC is running but cannot yet read "
                    "its exact playback position."
                )

        elif status.get(
            "mediaDetected"
        ):

            message = (
                "I've synchronized with the media "
                "information you provided. VLC itself "
                "was not detected on the host."
            )

        else:

            message = (
                "I couldn't detect a VLC process "
                "running on the host."
            )

        print(
            json.dumps(
                {
                    "success": True,

                    "action": "start",

                    "text": message,

                    "vlc": status,

                    "permissionGranted":
                        check_permission(),

                    "spoilerShield": True,
                }
            )
        )

        return

    # ---------------------------------------------------------------
    # React
    # ---------------------------------------------------------------

    if action in {
        "react",
        "comment",
    }:

        status = get_vlc_status(
            media_hint=media_hint,
            current_time_str=current_time_str,
            require_permission=True,
        )

        reaction = generate_buddy_reaction(
            comment,
            status,
            allow_spoilers,
        )

        session = load_session()

        history = session.get(
            "commentsHistory",
            [],
        )

        history.append(
            {
                "timestamp": now(),
                "comment": comment,
                "media": status.get(
                    "cleanTitle"
                ),
                "position": (
                    status.get(
                        "estimatedCurrentTimeSec"
                    )
                    or status.get(
                        "currentTimeSec"
                    )
                ),
            }
        )

        session["commentsHistory"] = history[-100:]

        save_session(session)

        print(
            json.dumps(
                {
                    "success": True,

                    "action": "react",

                    **reaction,
                }
            )
        )

        return

    # ---------------------------------------------------------------
    # Reset
    # ---------------------------------------------------------------

    if action in {
        "reset",
        "clear",
        "clear_session",
        "disconnect",
        "reset_session",
    }:

        print(
            json.dumps(
                reset_session()
            )
        )

        return

    # ---------------------------------------------------------------
    # Help
    # ---------------------------------------------------------------

    if action in {
        "help",
        "troubleshoot",
        "not_working",
    }:

        print(
            json.dumps(
                {
                    "success": True,

                    "action": "help",

                    "text": (
                        "VLC Watch-Along detection uses "
                        "host-level process inspection first. "
                        "VLC's local HTTP/MPRIS interfaces "
                        "are optional telemetry sources used "
                        "only to obtain playback position, "
                        "duration, title, and state."
                    ),
                }
            )
        )

        return

    # ---------------------------------------------------------------
    # Unknown action -> status
    # ---------------------------------------------------------------

    status = get_vlc_status(
        media_hint=media_hint,
        current_time_str=current_time_str,
        require_permission=True,
    )

    print(
        json.dumps(
            {
                "success": True,
                "action": action,
                "vlc": status,
            }
        )
    )


if __name__ == "__main__":
    main()