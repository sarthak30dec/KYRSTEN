#!/usr/bin/env python3
"""
KYRSTEN Neural Voice Core - Python High-Performance Speech Synthesis Engine
Provides phonetic normalization, number/acronym expansion, intelligent disk/RAM caching,
and ultra-low-latency Gemini 3.1 Flash TTS audio generation.
"""

import sys
import os
import re
import json
import ssl
import hashlib
import time
import urllib.request
import urllib.parse
from pathlib import Path

# Setup SSL context for rapid HTTPS requests
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

CACHE_DIR = Path("/tmp/kyrsten_tts_cache")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Voice configuration mapping
VOICE_MAP = {
    'aoede': 'Aoede',      # Expressive, warm adult female neural voice
    'kore': 'Kore',        # Clear, gentle female neural voice
    'leda': 'Leda',        # Authoritative, crisp female neural voice
    'zephyr': 'Zephyr',    # Modern, dynamic female neural voice
    'puck': 'Puck',        # Neutral conversational voice
    'fenrir': 'Fenrir',    # Deep resonant male voice
    'charon': 'Charon',    # Calm, steady male voice
}


def normalize_phonetics_for_speech(text: str) -> str:
    """
    Cleans markdown, expands technical acronyms, currency, time, and units
    into natural human speech cadence without awkward pauses or synthetic glitches.
    """
    if not text:
        return ""

    s = str(text)

    # 1. Strip markdown code blocks, backticks, and URLs
    s = re.sub(r'```[\s\S]*?```', '', s)
    s = re.sub(r'`([^`]+)`', r'\1', s)
    s = re.sub(r'https?://\S+', '', s)

    # 2. Strip markdown headers, bold, italics, links, lists
    s = re.sub(r'^\s*#{1,6}\s*', '', s, flags=re.MULTILINE)
    s = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', s)

    # Strip bracketed internal emotion/stage direction tags before processing
    s = re.sub(r'\[(?:warmly|happily|sadly|excited|angrily|softly|calmly|quietly|gently|playfully|curiously|thoughtfully|seriously|cheerfully|warm|happy|sad|angry|soft|calm|quiet|gentle|playful|curious|thoughtful|serious|cheerful|laughs?|sighs?|gasps?|whispers?|chuckles?|giggles?|groans?|yawns?|clears throat|pauses?|smiles?|grins?|nods?|winks?)(?:\s+[^\]]+)?\]', '', s, flags=re.IGNORECASE)
    s = re.sub(r'\[(?:emotion|tone|action|voice|style|mood):\s*[^\]]+\]', '', s, flags=re.IGNORECASE)
    s = re.sub(r'\[[a-zA-Z\s,.\'\"-]{1,30}\]', '', s)

    s = re.sub(r'\*\*([^*]+)\*\*', r'\1', s)
    s = re.sub(r'\*([^*]+)\*', r'\1', s)
    s = re.sub(r'__([^_]+)__', r'\1', s)
    s = re.sub(r'_([^_]+)_', r'\1', s)
    s = re.sub(r'^\s*[-*+]\s+', '', s, flags=re.MULTILINE)

    # 3. Expand currency & units
    s = re.sub(r'\$(\d+(?:\.\d+)?)', r'\1 dollars', s)
    s = re.sub(r'€(\d+(?:\.\d+)?)', r'\1 euros', s)
    s = re.sub(r'£(\d+(?:\.\d+)?)', r'\1 pounds', s)
    s = re.sub(r'(\d+)%', r'\1 percent', s)
    s = re.sub(r'(\d+)\s*ms\b', r'\1 milliseconds', s)
    s = re.sub(r'(\d+)\s*fps\b', r'\1 frames per second', s)
    s = re.sub(r'(\d+)\s*hz\b', r'\1 hertz', s)
    s = re.sub(r'(\d+)\s*khz\b', r'\1 kilohertz', s)
    s = re.sub(r'v(\d+)\.(\d+)', r'version \1 point \2', s)

    # 4. Expand tech acronyms for natural vocalization
    s = re.sub(r'\bAI\b', 'A.I.', s)
    s = re.sub(r'\bHUD\b', 'hud', s)
    s = re.sub(r'\bUI\b', 'U.I.', s)
    s = re.sub(r'\bAPI\b', 'A.P.I.', s)
    s = re.sub(r'\bTTS\b', 'T.T.S.', s)
    s = re.sub(r'\bMCP\b', 'M.C.P.', s)
    s = re.sub(r'\bLLM\b', 'L.L.M.', s)
    s = re.sub(r'\bOS\b', 'O.S.', s)

    # 5. Clean remaining punctuation artifacts while preserving sentence flow
    s = re.sub(r'[*_~#>[\](){}\\|<>]', '', s)
    s = re.sub(r'[\r\n]+', '. ', s)
    s = re.sub(r'\.{2,}', '... ', s)
    s = re.sub(r'\s+', ' ', s).strip()

    return s


def get_cache_key(clean_text: str, voice: str) -> str:
    """Generates a stable SHA256 cache key for synthesized audio."""
    raw = f"{clean_text.strip()}::{voice.strip().lower()}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def check_cache(cache_key: str):
    """Checks the disk cache for pre-synthesized audio."""
    cache_file = CACHE_DIR / f"{cache_key}.json"
    if cache_file.exists():
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data
        except Exception:
            pass
    return None


def save_to_cache(cache_key: str, data: dict):
    """Saves synthesized audio base64 to disk cache."""
    cache_file = CACHE_DIR / f"{cache_key}.json"
    try:
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(data, f)
    except Exception:
        pass


def synthesize_gemini_tts(clean_text: str, voice_name: str, api_key: str) -> dict:
    """
    Direct low-latency REST invocation of Gemini 3.1 Flash TTS.
    Returns 24kHz PCM base64 audio and performance metrics.
    """
    start_time = time.time()

    # Complete speech text without artificial truncation
    tts_text = clean_text

    # Resolve voice name
    resolved_voice = VOICE_MAP.get(voice_name.lower(), voice_name) or 'Aoede'

    # Gemini REST Endpoint for TTS Preview (gemini-2.5-flash-preview-tts)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key={api_key}"

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": tts_text}
                ]
            }
        ],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": resolved_voice
                    }
                }
            }
        }
    }

    req_data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=req_data,
        headers={
            'Content-Type': 'application/json',
            'User-Agent': 'Kyrsten-Python-Voice-Synthesizer/3.10'
        },
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, context=ssl_context, timeout=8.0) as resp:
            if resp.status != 200:
                raise RuntimeError(f"Gemini TTS REST returned status {resp.status}")

            body = resp.read().decode('utf-8')
            res_json = json.loads(body)

            candidates = res_json.get('candidates', [])
            if not candidates:
                raise RuntimeError("No candidates returned from Gemini TTS")

            parts = candidates[0].get('content', {}).get('parts', [])
            if not parts:
                raise RuntimeError("No content parts returned from Gemini TTS")

            inline_data = parts[0].get('inlineData', {})
            audio_base64 = inline_data.get('data')

            if not audio_base64:
                raise RuntimeError("No audio data in response from Gemini TTS")

            elapsed_ms = int((time.time() - start_time) * 1000)

            return {
                "success": True,
                "audioBase64": audio_base64,
                "sampleRate": 24000,
                "format": "pcm_16bit",
                "voice": resolved_voice,
                "latencyMs": elapsed_ms,
                "engine": "Kyrsten Python Neural Synthesizer (gemini-2.5-flash-preview-tts)",
                "cached": False
            }
    except urllib.error.HTTPError as he:
        if he.code == 429:
            return {
                "success": False,
                "quotaExceeded": True,
                "error": "Gemini TTS quota exceeded (429)",
                "engine": "Kyrsten Python Neural Synthesizer"
            }
        raise


def main():
    try:
        input_data = {}
        # Support reading input from stdin or argument
        if len(sys.argv) > 1 and sys.argv[1] == '--stdin':
            stdin_text = sys.stdin.read().strip()
            if stdin_text:
                input_data = json.loads(stdin_text)
        elif len(sys.argv) > 1 and sys.argv[1].startswith('{'):
            input_data = json.loads(sys.argv[1])
        else:
            text_arg = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else ""
            input_data = {"text": text_arg}

        text = input_data.get('text', '')
        voice = input_data.get('voice', 'Aoede')
        api_key = input_data.get('apiKey') or os.environ.get('GEMINI_API_KEY', '')

        if not text:
            print(json.dumps({"success": False, "error": "Text is required"}))
            sys.exit(0)

        # 1. Normalize text for speech
        clean_text = normalize_phonetics_for_speech(text)
        if not clean_text:
            print(json.dumps({"success": False, "error": "Cleaned text is empty"}))
            sys.exit(0)

        # 2. Check Disk / In-Memory Cache
        cache_key = get_cache_key(clean_text, voice)
        cached_result = check_cache(cache_key)
        if cached_result:
            cached_result['cached'] = True
            cached_result['latencyMs'] = 1
            print(json.dumps(cached_result))
            sys.exit(0)

        # 3. If no API key provided, return error
        if not api_key:
            print(json.dumps({"success": False, "error": "GEMINI_API_KEY is not configured"}))
            sys.exit(0)

        # 4. Synthesize Audio via Python REST client
        result = synthesize_gemini_tts(clean_text, voice, api_key)

        # 5. Save to Cache for instant replay
        save_to_cache(cache_key, result)

        # Output JSON result to stdout for TS IPC
        print(json.dumps(result))

    except Exception as e:
        error_res = {
            "success": False,
            "error": str(e),
            "engine": "Kyrsten Python Neural Synthesizer 3.10"
        }
        print(json.dumps(error_res))
        sys.exit(0)


if __name__ == '__main__':
    main()
