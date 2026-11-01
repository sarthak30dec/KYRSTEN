#!/usr/bin/env python3
"""
KYRSTEN Neural Voice Core 4.0

Fast, high-quality Gemini TTS with:
  - natural feminine performance direction
  - phonetic/markdown normalization
  - process-memory and atomic disk caching
  - reusable HTTPS connections
  - bounded retries for transient API failures
  - backward-compatible JSON input/output for TypeScript IPC

No third-party Python packages are required.
"""

from __future__ import annotations

import hashlib
import http.client
import json
import os
import random
import re
import ssl
import sys
import threading
import time
from collections import OrderedDict
from pathlib import Path
from typing import Any, Dict, Optional, Tuple


ENGINE_VERSION = "4.0"
ENGINE_NAME = f"Kyrsten Python Neural Synthesizer {ENGINE_VERSION}"
API_HOST = "generativelanguage.googleapis.com"

DEFAULT_MODEL = os.environ.get(
    "KYRSTEN_TTS_MODEL",
    "gemini-2.5-flash-preview-tts",
)
FALLBACK_TTS_MODELS = [
    "gemini-2.5-flash-preview-tts",
    "gemini-3.1-flash-tts-preview",
    "gemini-2.5-pro-preview-tts",
]
DEFAULT_VOICE = os.environ.get("KYRSTEN_TTS_VOICE", "Aoede")
DEFAULT_TIMEOUT_SECONDS = float(
    os.environ.get("KYRSTEN_TTS_TIMEOUT", "15")
)
DEFAULT_RETRIES = int(os.environ.get("KYRSTEN_TTS_RETRIES", "2"))
MEMORY_CACHE_SIZE = max(
    1,
    int(os.environ.get("KYRSTEN_TTS_RAM_CACHE_SIZE", "32")),
)
CACHE_SCHEMA_VERSION = 2

CACHE_DIR = Path(
    os.environ.get(
        "KYRSTEN_TTS_CACHE_DIR",
        "/tmp/kyrsten_tts_cache",
    )
)
CACHE_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)


# Official Gemini voice names.
# Descriptors are tonal characteristics, not gender guarantees.
VOICE_MAP = {
    "zephyr": "Zephyr",
    "puck": "Puck",
    "charon": "Charon",
    "kore": "Kore",
    "fenrir": "Fenrir",
    "leda": "Leda",
    "orus": "Orus",
    "aoede": "Aoede",
    "callirrhoe": "Callirrhoe",
    "autonoe": "Autonoe",
    "enceladus": "Enceladus",
    "iapetus": "Iapetus",
    "umbriel": "Umbriel",
    "algieba": "Algieba",
    "despina": "Despina",
    "erinome": "Erinome",
    "algenib": "Algenib",
    "rasalgethi": "Rasalgethi",
    "laomedeia": "Laomedeia",
    "achernar": "Achernar",
    "alnilam": "Alnilam",
    "schedar": "Schedar",
    "gacrux": "Gacrux",
    "pulcherrima": "Pulcherrima",
    "achird": "Achird",
    "zubenelgenubi": "Zubenelgenubi",
    "vindemiatrix": "Vindemiatrix",
    "sadachbia": "Sadachbia",
    "sadaltager": "Sadaltager",
    "sulafat": "Sulafat",

    # Friendly product alias.
    "kyrsten": "Aoede",
}


DEFAULT_STYLE = (
    "Speak as Kyrsten, a warm adult woman with a naturally feminine voice. "
    "Use a relaxed, one-to-one conversational cadence, subtle expressive "
    "intonation, a gentle vocal smile, crisp articulation, and natural "
    "micro-pauses. Read and speak the exact transcript verbatim from the very first word "
    "to the very last word, preserving all greetings, names, questions, and sentences "
    "without skipping, dropping, paraphrasing, or summarizing anything."
)


# Compiled once so repeated in-process requests normalize with less overhead.
_CODE_BLOCK_RE = re.compile(r"```[\s\S]*?```")
_INLINE_CODE_RE = re.compile(r"`([^`]+)`")
_URL_RE = re.compile(r"https?://\S+")
_HEADER_RE = re.compile(r"^\s*#{1,6}\s*", re.MULTILINE)
_BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")
_ITALIC_STAR_RE = re.compile(r"\*([^*]+)\*")
_BOLD_UNDERSCORE_RE = re.compile(r"__([^_]+)__")
_ITALIC_UNDERSCORE_RE = re.compile(r"_([^_]+)_")
_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]+\)")
_LIST_RE = re.compile(
    r"^\s*(?:[-*+]|\d+[.)])\s+",
    re.MULTILINE,
)
# Internal emotion, prosody, and stage directives (e.g. [warmly], [happily], [excited], [sighs], [laughs], etc.)
_EMOTION_TAG_RE = re.compile(
    r"\[(?:warmly|happily|sadly|excited|angrily|softly|calmly|quietly|gently|playfully|curiously|thoughtfully|seriously|cheerfully|teasingly|teasing|naughty|warm|happy|sad|angry|soft|calm|quiet|gentle|playful|curious|thoughtful|serious|cheerful|laughs?|sighs?|gasps?|whispers?|chuckles?|giggles?|groans?|yawns?|clears throat|pauses?|smiles?|grins?|nods?|winks?)(?:\s+[^\]]+)?\]",
    re.IGNORECASE,
)
_METADATA_TAG_RE = re.compile(
    r"\[(?:emotion|tone|action|voice|style|mood):\s*[^\]]+\]",
    re.IGNORECASE,
)
_BRACKETED_DIRECTIVE_RE = re.compile(r"\[[a-zA-Z\s,.'\"-]{1,30}\]")
_ARTIFACT_RE = re.compile(r"[*_~#>\[\](){}\\|<>]")
_WHITESPACE_RE = re.compile(r"\s+")


_ACRONYMS = {
    "AI": "A I",
    "HUD": "hud",
    "UI": "U I",
    "API": "A P I",
    "TTS": "T T S",
    "MCP": "M C P",
    "LLM": "L L M",
    "OS": "O S",
    "CPU": "C P U",
    "GPU": "G P U",
    "RAM": "ram",
    "JSON": "jay son",
}

_ACRONYM_RE = re.compile(
    r"\b(?:"
    + "|".join(map(re.escape, _ACRONYMS))
    + r")\b"
)


_RAM_CACHE: "OrderedDict[str, Dict[str, Any]]" = OrderedDict()
_RAM_CACHE_LOCK = threading.RLock()

_HTTP_LOCK = threading.Lock()
_HTTP_CONNECTION: Optional[http.client.HTTPSConnection] = None

# Normal TLS verification protects the API key and generated audio.
_SSL_CONTEXT = ssl.create_default_context()


def normalize_phonetics_for_speech(text: str) -> str:
    """
    Convert common written notation into smooth, speakable text.
    """
    if not text:
        return ""

    s = str(text).replace("\u00a0", " ")

    # Markdown, code, and URLs.
    s = _CODE_BLOCK_RE.sub("", s)
    s = _INLINE_CODE_RE.sub(r"\1", s)
    s = _URL_RE.sub("", s)
    s = _HEADER_RE.sub("", s)
    s = _LINK_RE.sub(r"\1", s)

    # Strip internal emotion, stage directions, and prosody metadata tags before phonetic conversion
    s = _EMOTION_TAG_RE.sub("", s)
    s = _METADATA_TAG_RE.sub("", s)
    s = _BRACKETED_DIRECTIVE_RE.sub("", s)

    s = _BOLD_RE.sub(r"\1", s)
    s = _ITALIC_STAR_RE.sub(r"\1", s)
    s = _BOLD_UNDERSCORE_RE.sub(r"\1", s)
    s = _ITALIC_UNDERSCORE_RE.sub(r"\1", s)
    s = _LIST_RE.sub("", s)

    # Currency, percentages, time, versions, and performance units.
    number = r"(\d[\d,]*(?:\.\d+)?)"

    s = re.sub(r"\$" + number, r"\1 dollars", s)
    s = re.sub(r"€" + number, r"\1 euros", s)
    s = re.sub(r"£" + number, r"\1 pounds", s)
    s = re.sub(number + r"%", r"\1 percent", s)

    s = re.sub(
        number + r"\s*ms\b",
        r"\1 milliseconds",
        s,
        flags=re.IGNORECASE,
    )
    s = re.sub(
        number + r"\s*fps\b",
        r"\1 frames per second",
        s,
        flags=re.IGNORECASE,
    )

    # Match kHz before Hz.
    s = re.sub(
        number + r"\s*kHz\b",
        r"\1 kilohertz",
        s,
        flags=re.IGNORECASE,
    )
    s = re.sub(
        number + r"\s*Hz\b",
        r"\1 hertz",
        s,
        flags=re.IGNORECASE,
    )

    s = re.sub(
        r"\bv(\d+)\.(\d+(?:\.\d+)*)",
        lambda match: (
            "version "
            + match.group(1)
            + " point "
            + match.group(2).replace(".", " point ")
        ),
        s,
        flags=re.IGNORECASE,
    )

    s = re.sub(
        r"\b(\d{1,2}):(\d{2})\s*(am|pm)\b",
        r"\1 \2 \3",
        s,
        flags=re.IGNORECASE,
    )

    # Expand common acronyms.
    s = _ACRONYM_RE.sub(
        lambda match: _ACRONYMS[match.group(0)],
        s,
    )

    # Preserve sentence cadence without turning every line into a hard stop.
    s = re.sub(r"\r\n?", "\n", s)
    s = re.sub(r"\n{2,}", ". ", s)
    s = re.sub(r"\n", " ", s)
    s = _ARTIFACT_RE.sub("", s)
    s = re.sub(r"\.{4,}", "...", s)
    s = _WHITESPACE_RE.sub(" ", s).strip()

    return s


def resolve_voice(voice_name: str) -> str:
    """
    Resolve known aliases while accepting future Gemini voice names.
    """
    name = str(voice_name or DEFAULT_VOICE).strip()
    return VOICE_MAP.get(name.lower(), name) or DEFAULT_VOICE


def build_performance_prompt(
    clean_text: str,
    style: str = "",
) -> str:
    """
    Add concise acting direction without rewriting the transcript.
    """
    direction = str(style).strip() or DEFAULT_STYLE
    return f"{direction}\n\n### TRANSCRIPT\n{clean_text}"


def get_cache_key(
    clean_text: str,
    voice: str,
    model: str = DEFAULT_MODEL,
    style: str = "",
) -> str:
    """
    Generate a stable key that cannot mix voices, models, or performances.
    """
    canonical = json.dumps(
        {
            "schema": CACHE_SCHEMA_VERSION,
            "text": clean_text.strip(),
            "voice": resolve_voice(voice),
            "model": model.strip(),
            "style": style.strip() or DEFAULT_STYLE,
        },
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )

    return hashlib.sha256(
        canonical.encode("utf-8")
    ).hexdigest()


def _remember(
    cache_key: str,
    data: Dict[str, Any],
) -> None:
    """
    Add a result to the process-memory LRU cache.
    """
    with _RAM_CACHE_LOCK:
        _RAM_CACHE[cache_key] = dict(data)
        _RAM_CACHE.move_to_end(cache_key)

        while len(_RAM_CACHE) > MEMORY_CACHE_SIZE:
            _RAM_CACHE.popitem(last=False)


def check_cache(
    cache_key: str,
    alt_key: Optional[str] = None,
) -> Optional[Tuple[Dict[str, Any], str]]:
    """
    Check the RAM LRU first, then the persistent disk cache.
    """
    keys_to_check = [cache_key]
    if alt_key and alt_key != cache_key:
        keys_to_check.append(alt_key)

    for k in keys_to_check:
        with _RAM_CACHE_LOCK:
            cached = _RAM_CACHE.get(k)
            if cached is not None:
                _RAM_CACHE.move_to_end(k)
                return dict(cached), "memory"

        cache_file = CACHE_DIR / f"{k}.json"
        try:
            with cache_file.open(
                "r",
                encoding="utf-8",
            ) as handle:
                data = json.load(handle)

            if data.get("success") and data.get("audioBase64"):
                _remember(cache_key, data)
                return data, "disk"

        except (OSError, ValueError, TypeError):
            pass

    return None


def save_to_cache(
    cache_key: str,
    data: Dict[str, Any],
    alt_key: Optional[str] = None,
) -> None:
    """
    Populate RAM immediately and replace the disk entry atomically.
    """
    keys_to_save = [cache_key]
    if alt_key and alt_key != cache_key:
        keys_to_save.append(alt_key)

    for k in keys_to_save:
        _remember(k, data)
        cache_file = CACHE_DIR / f"{k}.json"
        temp_file = (
            CACHE_DIR
            / f".{k}.{os.getpid()}.tmp"
        )

        try:
            with temp_file.open(
                "w",
                encoding="utf-8",
            ) as handle:
                json.dump(
                    data,
                    handle,
                    ensure_ascii=False,
                    separators=(",", ":"),
                )

            os.replace(temp_file, cache_file)

        except OSError:
            try:
                temp_file.unlink(missing_ok=True)
            except OSError:
                pass
        try:
            temp_file.unlink(missing_ok=True)
        except OSError:
            pass


def _close_connection() -> None:
    """
    Close and discard the persistent HTTPS connection.
    """
    global _HTTP_CONNECTION

    if _HTTP_CONNECTION is not None:
        try:
            _HTTP_CONNECTION.close()
        except OSError:
            pass

    _HTTP_CONNECTION = None


def _post_json(
    path: str,
    payload: Dict[str, Any],
    api_key: str,
    timeout: float,
) -> Tuple[int, bytes]:
    """
    POST JSON over a reusable verified TLS connection.
    """
    global _HTTP_CONNECTION

    body = json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")

    with _HTTP_LOCK:
        if _HTTP_CONNECTION is None:
            _HTTP_CONNECTION = http.client.HTTPSConnection(
                API_HOST,
                timeout=timeout,
                context=_SSL_CONTEXT,
            )
        else:
            _HTTP_CONNECTION.timeout = timeout

        try:
            _HTTP_CONNECTION.request(
                "POST",
                path,
                body=body,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Accept-Encoding": "identity",
                    "Connection": "keep-alive",
                    "User-Agent": (
                        "Kyrsten-Python-Voice-Synthesizer/"
                        f"{ENGINE_VERSION}"
                    ),
                    "x-goog-api-key": api_key,
                },
            )

            response = _HTTP_CONNECTION.getresponse()
            response_body = response.read()
            status = response.status

            if response.will_close:
                _close_connection()

            return status, response_body

        except (OSError, http.client.HTTPException):
            _close_connection()
            raise


def _api_error(
    status: int,
    body: bytes,
) -> str:
    """
    Extract a safe, readable Gemini API error message.
    """
    try:
        parsed = json.loads(body.decode("utf-8"))
        message = parsed.get("error", {}).get("message")

        if message:
            return (
                f"Gemini TTS REST returned status "
                f"{status}: {message}"
            )

    except (UnicodeDecodeError, ValueError, TypeError):
        pass

    return f"Gemini TTS REST returned status {status}"


def _extract_audio(
    response_json: Dict[str, Any],
) -> Tuple[str, str]:
    """
    Locate audio data even if Gemini returns additional content parts.
    """
    candidates = response_json.get("candidates") or []

    for candidate in candidates:
        content = candidate.get("content") or {}
        parts = content.get("parts") or []

        for part in parts:
            inline = (
                part.get("inlineData")
                or part.get("inline_data")
                or {}
            )

            data = inline.get("data")

            if data:
                mime_type = (
                    inline.get("mimeType")
                    or inline.get("mime_type")
                    or "audio/L16;rate=24000"
                )

                return data, mime_type

    raise RuntimeError(
        "No audio data in response from Gemini TTS"
    )


def synthesize_gemini_tts(
    clean_text: str,
    voice_name: str,
    api_key: str,
    *,
    model: str = DEFAULT_MODEL,
    style: str = "",
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    retries: int = DEFAULT_RETRIES,
) -> Dict[str, Any]:
    """
    Generate complete 24 kHz mono PCM audio with multi-model resiliency.

    Retries transient failures and falls back through candidate models.
    """
    started = time.perf_counter()
    resolved_voice = resolve_voice(voice_name)

    prompt = build_performance_prompt(
        clean_text,
        style,
    )

    models_to_try = [model]
    for m in FALLBACK_TTS_MODELS:
        if m not in models_to_try:
            models_to_try.append(m)

    last_error: Optional[Exception] = None

    for active_model in models_to_try:
        path = f"/v1beta/models/{active_model}:generateContent"

        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt,
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {
                        "prebuiltVoiceConfig": {
                            "voiceName": resolved_voice,
                        }
                    }
                },
            },
        }

        attempts = max(1, retries + 1)

        for attempt in range(attempts):
            try:
                status, body = _post_json(
                    path,
                    payload,
                    api_key,
                    timeout,
                )

                if status == 200:
                    response_json = json.loads(
                        body.decode("utf-8")
                    )

                    audio_base64, mime_type = _extract_audio(
                        response_json
                    )

                    elapsed_ms = round(
                        (time.perf_counter() - started) * 1000
                    )

                    return {
                        "success": True,
                        "text": clean_text,
                        "audioBase64": audio_base64,
                        "sampleRate": 24000,
                        "format": "pcm_16bit",
                        "mimeType": mime_type,
                        "voice": resolved_voice,
                        "latencyMs": elapsed_ms,
                        "engine": (
                            f"{ENGINE_NAME} ({active_model})"
                        ),
                        "model": active_model,
                        "cached": False,
                    }

                error = RuntimeError(
                    _api_error(status, body)
                )

                # If rate limited (429) or unavailable (503), try next fallback model immediately
                if status in {429, 503}:
                    last_error = error
                    break

                if status not in {
                    408,
                    500,
                    502,
                    504,
                }:
                    last_error = error
                    break

                last_error = error

            except (
                OSError,
                http.client.HTTPException,
                UnicodeDecodeError,
                ValueError,
            ) as exc:
                last_error = exc
                _close_connection()

            if attempt + 1 < attempts:
                delay = (
                    0.12 * (2 ** attempt)
                    + random.uniform(0.0, 0.06)
                )
                time.sleep(delay)

    raise RuntimeError(
        str(last_error or "Gemini TTS request failed across all models")
    )


def _read_input(
    argv: list[str],
) -> Dict[str, Any]:
    """
    Read JSON stdin, a JSON argument, or plain text arguments.
    """
    if len(argv) > 1 and argv[1] == "--stdin":
        raw = sys.stdin.read().strip()
        return json.loads(raw) if raw else {}

    if (
        len(argv) > 1
        and argv[1].lstrip().startswith("{")
    ):
        return json.loads(argv[1])

    return {
        "text": (
            " ".join(argv[1:])
            if len(argv) > 1
            else ""
        )
    }


def _emit(
    data: Dict[str, Any],
) -> None:
    """
    Emit compact JSON to reduce serialization and IPC overhead.
    """
    sys.stdout.write(
        json.dumps(
            data,
            ensure_ascii=False,
            separators=(",", ":"),
        )
    )
    sys.stdout.write("\n")


def main() -> None:
    try:
        input_data = _read_input(sys.argv)

        text = input_data.get("text", "")
        voice = input_data.get(
            "voice",
            DEFAULT_VOICE,
        )
        style = input_data.get("style", "")
        model = input_data.get(
            "model",
            DEFAULT_MODEL,
        )

        api_key = (
            input_data.get("apiKey")
            or os.environ.get("GEMINI_API_KEY", "")
        )

        timeout = float(
            input_data.get(
                "timeout",
                DEFAULT_TIMEOUT_SECONDS,
            )
        )
        retries = int(
            input_data.get(
                "retries",
                DEFAULT_RETRIES,
            )
        )

        if not text:
            _emit(
                {
                    "success": False,
                    "error": "Text is required",
                }
            )
            return

        clean_text = normalize_phonetics_for_speech(
            str(text)
        )

        if not clean_text:
            _emit(
                {
                    "success": False,
                    "error": "Cleaned text is empty",
                }
            )
            return

        cache_key = get_cache_key(
            clean_text,
            str(voice),
            str(model),
            str(style),
        )
        alt_key = hashlib.sha256(
            f"{clean_text.strip()}::{resolve_voice(voice).lower()}".encode("utf-8")
        ).hexdigest()

        cached = check_cache(cache_key, alt_key)

        if cached:
            result, cache_level = cached

            result["cached"] = True
            result["cacheLevel"] = cache_level
            result["latencyMs"] = (
                0 if cache_level == "memory" else 1
            )

            _emit(result)
            return

        if not api_key:
            _emit(
                {
                    "success": False,
                    "error": (
                        "GEMINI_API_KEY is not configured"
                    ),
                }
            )
            return

        result = synthesize_gemini_tts(
            clean_text,
            str(voice),
            str(api_key),
            model=str(model),
            style=str(style),
            timeout=max(1.0, timeout),
            retries=max(0, min(retries, 5)),
        )

        save_to_cache(cache_key, result, alt_key)
        _emit(result)

    except Exception as exc:
        err_str = str(exc)
        is_quota = "429" in err_str or "quota" in err_str.lower() or "resource_exhausted" in err_str.lower()
        _emit(
            {
                "success": False,
                "quotaExceeded": is_quota,
                "error": err_str,
                "engine": ENGINE_NAME,
            }
        )


if __name__ == "__main__":
    main()