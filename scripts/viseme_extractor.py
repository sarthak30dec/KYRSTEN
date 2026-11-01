#!/usr/bin/env python3
"""
KYRSTEN Avatar Viseme & Phoneme Timing Extractor
Python 3.10+

Purpose
-------
Produces a timestamped viseme timeline for Kyrsten's avatar.

IMPORTANT:
This module prioritizes REAL alignment information when available.

Priority:
    1. TTS phoneme/viseme timestamps
    2. TTS word timestamps + phonetic estimation
    3. Actual audio speech-region detection + phonetic estimation
    4. Text-duration fallback

The audio playback timeline remains the source of truth whenever
actual timing information is available.

No external Python dependencies are required.
"""

from __future__ import annotations

import base64
import io
import json
import math
import re
import struct
import sys
import wave
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


# ---------------------------------------------------------------------------
# VISEME DEFINITIONS
# ---------------------------------------------------------------------------

REST = "REST"

# These names should match the avatar assets already used by the application.
#
# Existing conceptual groups:
#   REST
#   AA
#   EH
#   IH
#   IY
#   OW
#   UW
#   MBP
#   FV
#   TH
#   TD
#   SZ
#   SH_CH
#   KG
#   L
#   R
#   W
#
# The actual runtime may map aliases such as SH_CH -> viseme_sh_ch.png.


# ---------------------------------------------------------------------------
# PHONEME -> VISEME
# ---------------------------------------------------------------------------

PHONEME_TO_VISEME: Dict[str, str] = {
    # Vowels
    "AA": "AA",
    "AE": "AA",
    "AH": "AH",
    "AO": "OW",
    "AW": "OW",
    "AY": "AA",
    "EH": "EH",
    "ER": "R",
    "EY": "EH",
    "IH": "IH",
    "IY": "IY",
    "OW": "OW",
    "OY": "OW",
    "UH": "UH",
    "UW": "UW",

    # Bilabials
    "B": "MBP",
    "M": "MBP",
    "P": "MBP",

    # Labiodentals
    "F": "FV",
    "V": "FV",

    # Dental
    "TH": "TH",
    "DH": "TH",

    # Alveolar
    "T": "TD",
    "D": "TD",
    "N": "TD",

    # Liquids / approximants
    "L": "L",
    "R": "R",
    "W": "W",

    # Sibilants / affricates
    "CH": "SH_CH",
    "JH": "SH_CH",
    "SH": "SH_CH",
    "ZH": "SH_CH",
    "S": "SZ",
    "Z": "SZ",

    # Velars
    "K": "KG",
    "G": "KG",
    "NG": "KG",

    # Glides / consonants
    "Y": "IY",
    "HH": "AH",

    # Silence / special symbols
    "SIL": REST,
    "SP": REST,
    "SILENCE": REST,
    "PAUSE": REST,
}


# ---------------------------------------------------------------------------
# TEXT FALLBACK RULES
#
# These are ONLY used when actual phoneme timing is unavailable.
# They are NOT considered exact pronunciation.
# ---------------------------------------------------------------------------

CLUSTER_RULES: Sequence[Tuple[re.Pattern[str], str]] = [
    # Longer clusters first.

    (re.compile(r"^(tch)", re.I), "SH_CH"),
    (re.compile(r"^(sch)", re.I), "SH_CH"),
    (re.compile(r"^(ch)", re.I), "SH_CH"),
    (re.compile(r"^(sh)", re.I), "SH_CH"),
    (re.compile(r"^(zh)", re.I), "SH_CH"),

    (re.compile(r"^(th)", re.I), "TH"),
    (re.compile(r"^(dh)", re.I), "TH"),

    (re.compile(r"^(mb|mp)", re.I), "MBP"),
    (re.compile(r"^(ph)", re.I), "FV"),

    (re.compile(r"^(ee|ea|ey|ie)", re.I), "IY"),
    (re.compile(r"^(oo|ou|ew)", re.I), "UW"),
    (re.compile(r"^(oa|ow)", re.I), "OW"),
    (re.compile(r"^(ai|ay)", re.I), "AA"),
    (re.compile(r"^(oi|oy)", re.I), "OW"),

    (re.compile(r"^(ar|er|ir|ur|or)", re.I), "R"),

    (re.compile(r"^(ng)", re.I), "KG"),

    (re.compile(r"^(ff|f|v)", re.I), "FV"),
    (re.compile(r"^(mm|m|bb|b|pp|p)", re.I), "MBP"),

    (re.compile(r"^(s|z|c[eiy])", re.I), "SZ"),

    (re.compile(r"^(w|wh)", re.I), "W"),
    (re.compile(r"^(ll|l)", re.I), "L"),
    (re.compile(r"^(rr|r)", re.I), "R"),

    (re.compile(r"^(k|ck|g|q|x)", re.I), "KG"),
    (re.compile(r"^(t|d|n)", re.I), "TD"),

    (re.compile(r"^(a)", re.I), "AA"),
    (re.compile(r"^(e)", re.I), "EH"),
    (re.compile(r"^(i|y)", re.I), "IH"),
    (re.compile(r"^(o)", re.I), "OW"),
    (re.compile(r"^(u)", re.I), "UH"),
]


# ---------------------------------------------------------------------------
# DATA STRUCTURES
# ---------------------------------------------------------------------------

@dataclass
class TimedPhoneme:
    phoneme: str
    start: float
    end: float
    confidence: float = 1.0


@dataclass
class TimedWord:
    word: str
    start: float
    end: float
    confidence: float = 1.0


@dataclass
class SpeechRegion:
    start: float
    end: float
    energy: float


# ---------------------------------------------------------------------------
# BASIC HELPERS
# ---------------------------------------------------------------------------

def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def clean_phoneme(value: Any) -> str:
    """
    Normalizes common phoneme representations.

    Handles forms such as:
        "AH"
        "AH0"
        "AH1"
        "phoneme:AH"
        "AH-1"
    """
    if value is None:
        return ""

    text = str(value).strip().upper()

    text = re.sub(r"^PHONEME[:=]\s*", "", text)
    text = re.sub(r"[^A-Z]", "", text)

    # Remove stress digits indirectly because the regex above removes digits.
    return text


def phoneme_to_viseme(phoneme: str) -> str:
    normalized = clean_phoneme(phoneme)

    if not normalized:
        return REST

    if normalized in PHONEME_TO_VISEME:
        return PHONEME_TO_VISEME[normalized]

    # Graceful aliases.
    aliases = {
        "SHCH": "SH_CH",
        "CHJ": "SH_CH",
        "TDN": "TD",
        "MBP": "MBP",
        "FV": "FV",
        "SZ": "SZ",
        "KG": "KG",
    }

    return aliases.get(normalized, "AH")


# ---------------------------------------------------------------------------
# TEXT -> VISEMES
# ---------------------------------------------------------------------------

def text_to_visemes(word: str) -> List[str]:
    """
    Emergency fallback only.

    Converts spelling into approximate viseme categories.

    This function does NOT know true pronunciation and must never be treated
    as phoneme-accurate alignment.
    """

    clean = re.sub(r"[^a-zA-Z']", "", word).lower()

    if not clean:
        return [REST]

    result: List[str] = []

    index = 0

    while index < len(clean):
        remaining = clean[index:]

        matched = False

        for pattern, viseme in CLUSTER_RULES:
            match = pattern.match(remaining)

            if not match:
                continue

            consumed = len(match.group(0))

            if consumed <= 0:
                consumed = 1

            result.append(viseme)
            index += consumed
            matched = True
            break

        if not matched:
            # Unknown character.
            # Use a neutral-ish open shape rather than crashing.
            result.append("AH")
            index += 1

    # Remove consecutive duplicates.
    deduped: List[str] = []

    for viseme in result:
        if not deduped or deduped[-1] != viseme:
            deduped.append(viseme)

    return deduped or [REST]


# ---------------------------------------------------------------------------
# WAV / PCM DECODING
# ---------------------------------------------------------------------------

def decode_audio_base64(
    audio_base64: str,
    supplied_sample_rate: int = 24000,
) -> Tuple[List[float], int]:
    """
    Decodes:
      - WAV/RIFF PCM
      - raw signed 16-bit little-endian PCM

    Returns:
        mono_samples, sample_rate
    """

    if not audio_base64:
        return [], supplied_sample_rate

    try:
        raw = base64.b64decode(audio_base64, validate=False)
    except Exception:
        return [], supplied_sample_rate

    if not raw:
        return [], supplied_sample_rate

    # WAV
    if raw[:4] == b"RIFF" and raw[8:12] == b"WAVE":
        try:
            with wave.open(io.BytesIO(raw), "rb") as wav:
                channels = wav.getnchannels()
                sample_width = wav.getsampwidth()
                sample_rate = wav.getframerate()
                frame_count = wav.getnframes()

                pcm = wav.readframes(frame_count)

            if sample_width != 2:
                return [], sample_rate

            if channels <= 0:
                return [], sample_rate

            total_samples = len(pcm) // 2

            if total_samples <= 0:
                return [], sample_rate

            values = struct.unpack(
                f"<{total_samples}h",
                pcm[:total_samples * 2],
            )

            if channels == 1:
                mono = [
                    value / 32768.0
                    for value in values
                ]
            else:
                mono = []

                for i in range(0, len(values), channels):
                    frame = values[i:i + channels]

                    if not frame:
                        break

                    mono.append(
                        sum(frame) / len(frame) / 32768.0
                    )

            return mono, sample_rate

        except Exception:
            return [], supplied_sample_rate

    # Raw PCM16 fallback.
    if len(raw) < 2:
        return [], supplied_sample_rate

    usable = len(raw) - (len(raw) % 2)

    try:
        values = struct.unpack(
            f"<{usable // 2}h",
            raw[:usable],
        )
    except Exception:
        return [], supplied_sample_rate

    return [
        value / 32768.0
        for value in values
    ], supplied_sample_rate


# ---------------------------------------------------------------------------
# AUDIO ENVELOPE
# ---------------------------------------------------------------------------

def compute_audio_envelope(
    samples: Sequence[float],
    sample_rate: int,
    hop_size: int = 240,
    window_size: int = 480,
) -> List[float]:
    """
    Computes RMS energy.

    At 24 kHz:
        hop=240 -> 10 ms
        window=480 -> 20 ms

    RMS is used for speech activity / openness only.
    It does NOT identify phonemes.
    """

    if not samples or sample_rate <= 0:
        return []

    envelope: List[float] = []

    index = 0

    while index < len(samples):
        end = min(len(samples), index + window_size)

        chunk = samples[index:end]

        if not chunk:
            break

        rms = math.sqrt(
            sum(value * value for value in chunk)
            / len(chunk)
        )

        envelope.append(rms)

        index += hop_size

    return envelope


# ---------------------------------------------------------------------------
# SPEECH ACTIVITY DETECTION
# ---------------------------------------------------------------------------

def _smooth_envelope(
    envelope: Sequence[float],
    radius: int = 2,
) -> List[float]:
    if not envelope:
        return []

    result: List[float] = []

    for i in range(len(envelope)):
        start = max(0, i - radius)
        end = min(len(envelope), i + radius + 1)

        section = envelope[start:end]

        result.append(
            sum(section) / len(section)
        )

    return result


def detect_speech_regions(
    envelope: Sequence[float],
    sample_rate: int,
    hop_size: int = 240,
) -> List[SpeechRegion]:
    """
    Detects broad speech regions.

    This is deliberately conservative.

    It is NOT a phoneme recognizer.
    """

    if not envelope:
        return []

    smoothed = _smooth_envelope(envelope, radius=2)

    # Robust noise-floor estimate using lower portion of energy values.
    sorted_values = sorted(smoothed)

    percentile_index = int(
        len(sorted_values) * 0.20
    )

    percentile_index = clamp(
        percentile_index,
        0,
        max(0, len(sorted_values) - 1),
    )

    noise_floor = sorted_values[int(percentile_index)]

    # Dynamic threshold.
    threshold = max(
        0.012,
        noise_floor * 2.5,
    )

    active = [
        value >= threshold
        for value in smoothed
    ]

    # Close tiny gaps so individual phonemes don't produce unnecessary
    # speech-region fragmentation.
    max_gap_frames = max(
        1,
        int(0.08 / (hop_size / sample_rate)),
    )

    i = 0

    while i < len(active):
        if active[i]:
            i += 1
            continue

        start = i

        while i < len(active) and not active[i]:
            i += 1

        gap_length = i - start

        if (
            gap_length <= max_gap_frames
            and start > 0
            and i < len(active)
            and active[start - 1]
            and active[i]
        ):
            for j in range(start, i):
                active[j] = True

    regions: List[SpeechRegion] = []

    i = 0

    while i < len(active):
        if not active[i]:
            i += 1
            continue

        start_frame = i

        energies: List[float] = []

        while i < len(active) and active[i]:
            energies.append(smoothed[i])
            i += 1

        end_frame = i

        start_time = start_frame * hop_size / sample_rate
        end_time = end_frame * hop_size / sample_rate

        if end_time > start_time:
            regions.append(
                SpeechRegion(
                    start=start_time,
                    end=end_time,
                    energy=(
                        sum(energies) / len(energies)
                        if energies
                        else 0.0
                    ),
                )
            )

    # Merge regions separated by tiny gaps.
    merged: List[SpeechRegion] = []

    merge_gap = 0.12

    for region in regions:
        if not merged:
            merged.append(region)
            continue

        previous = merged[-1]

        if region.start - previous.end <= merge_gap:
            merged[-1] = SpeechRegion(
                start=previous.start,
                end=max(previous.end, region.end),
                energy=max(previous.energy, region.energy),
            )
        else:
            merged.append(region)

    return merged


# ---------------------------------------------------------------------------
# PARSING ALIGNMENT DATA
# ---------------------------------------------------------------------------

def _get_float(
    obj: Dict[str, Any],
    keys: Sequence[str],
) -> Optional[float]:
    for key in keys:
        if key not in obj:
            continue

        try:
            return float(obj[key])
        except (TypeError, ValueError):
            continue

    return None


def parse_phoneme_alignment(
    alignment: Any,
) -> List[TimedPhoneme]:
    """
    Accepts flexible alignment formats.

    Supported conceptual examples:

    [
        {"phoneme":"HH","start":0.00,"end":0.05},
        {"phoneme":"AH","start":0.05,"end":0.13}
    ]

    or:

    [
        {"phoneme":"HH","startTime":0,"endTime":50}
    ]

    Times are assumed to be seconds unless the surrounding payload explicitly
    supplies milliseconds.
    """

    if not isinstance(alignment, list):
        return []

    result: List[TimedPhoneme] = []

    for item in alignment:
        if not isinstance(item, dict):
            continue

        phoneme = (
            item.get("phoneme")
            or item.get("phone")
            or item.get("value")
            or item.get("symbol")
        )

        if phoneme is None:
            continue

        start = _get_float(
            item,
            (
                "start",
                "startTime",
                "start_time",
                "offset",
                "offsetSeconds",
            ),
        )

        end = _get_float(
            item,
            (
                "end",
                "endTime",
                "end_time",
            ),
        )

        duration = _get_float(
            item,
            (
                "duration",
                "durationSeconds",
            ),
        )

        if start is None:
            continue

        if end is None and duration is not None:
            end = start + duration

        if end is None:
            continue

        # Some APIs expose millisecond timestamps.
        units = str(
            item.get("units", "")
        ).lower()

        if units in {"ms", "millisecond", "milliseconds"}:
            start /= 1000.0
            end /= 1000.0
        elif (
            start > 100.0
            or end > 100.0
        ):
            # Conservative heuristic for common millisecond APIs.
            start /= 1000.0
            end /= 1000.0

        if end <= start:
            continue

        confidence = _get_float(
            item,
            ("confidence", "score"),
        )

        if confidence is None:
            confidence = 1.0

        result.append(
            TimedPhoneme(
                phoneme=clean_phoneme(phoneme),
                start=max(0.0, start),
                end=max(0.0, end),
                confidence=clamp(confidence, 0.0, 1.0),
            )
        )

    result.sort(key=lambda item: item.start)

    return result


def parse_word_alignment(
    words: Any,
) -> List[TimedWord]:
    """
    Parses word-level timing information.

    Supported forms:

    [
        {"word":"hello","start":0.2,"end":0.7}
    ]
    """

    if not isinstance(words, list):
        return []

    result: List[TimedWord] = []

    for item in words:
        if not isinstance(item, dict):
            continue

        word = (
            item.get("word")
            or item.get("text")
            or item.get("token")
        )

        if not word:
            continue

        start = _get_float(
            item,
            (
                "start",
                "startTime",
                "start_time",
                "offset",
            ),
        )

        end = _get_float(
            item,
            (
                "end",
                "endTime",
                "end_time",
            ),
        )

        duration = _get_float(
            item,
            (
                "duration",
                "durationSeconds",
            ),
        )

        if start is None:
            continue

        if end is None and duration is not None:
            end = start + duration

        if end is None:
            continue

        units = str(
            item.get("units", "")
        ).lower()

        if units in {"ms", "millisecond", "milliseconds"}:
            start /= 1000.0
            end /= 1000.0
        elif start > 100.0 or end > 100.0:
            start /= 1000.0
            end /= 1000.0

        if end <= start:
            continue

        confidence = _get_float(
            item,
            ("confidence", "score"),
        )

        if confidence is None:
            confidence = 1.0

        result.append(
            TimedWord(
                word=str(word),
                start=max(0.0, start),
                end=max(0.0, end),
                confidence=clamp(confidence, 0.0, 1.0),
            )
        )

    result.sort(key=lambda item: item.start)

    return result


# ---------------------------------------------------------------------------
# PHONEME ALIGNMENT -> VISEME TIMELINE
# ---------------------------------------------------------------------------

def build_from_phoneme_alignment(
    phonemes: Sequence[TimedPhoneme],
    total_duration: float,
) -> List[Dict[str, Any]]:
    """
    Converts actual phoneme timestamps directly into viseme events.

    No duration redistribution occurs here.
    """

    timeline: List[Dict[str, Any]] = []

    previous_end = 0.0

    for phoneme in phonemes:
        start = clamp(
            phoneme.start,
            0.0,
            total_duration,
        )

        end = clamp(
            phoneme.end,
            start,
            total_duration,
        )

        if end <= start:
            continue

        # Explicit silence gap.
        if start > previous_end + 0.015:
            timeline.append(
                {
                    "time": round(previous_end, 4),
                    "viseme": REST,
                    "duration": round(
                        start - previous_end,
                        4,
                    ),
                    "weight": 0.0,
                    "source": "phoneme_alignment",
                }
            )

        viseme = phoneme_to_viseme(
            phoneme.phoneme
        )

        if viseme == REST:
            weight = 0.0
        else:
            weight = clamp(
                0.55 + phoneme.confidence * 0.45,
                0.55,
                1.0,
            )

        timeline.append(
            {
                "time": round(start, 4),
                "viseme": viseme,
                "duration": round(end - start, 4),
                "weight": round(weight, 3),
                "phoneme": phoneme.phoneme,
                "confidence": round(
                    phoneme.confidence,
                    3,
                ),
                "source": "phoneme_alignment",
            }
        )

        previous_end = max(
            previous_end,
            end,
        )

    if previous_end < total_duration:
        timeline.append(
            {
                "time": round(previous_end, 4),
                "viseme": REST,
                "duration": round(
                    total_duration - previous_end,
                    4,
                ),
                "weight": 0.0,
                "source": "phoneme_alignment",
            }
        )

    return merge_adjacent_visemes(timeline)


# ---------------------------------------------------------------------------
# WORD ALIGNMENT -> VISEMES
# ---------------------------------------------------------------------------

def estimate_visemes_inside_word(
    word: str,
    start: float,
    end: float,
) -> List[Dict[str, Any]]:
    """
    Creates approximate phonetic events inside a REAL word timing window.

    This is substantially better than distributing all words across the
    entire response duration, but it is still an approximation because
    spelling is not pronunciation.
    """

    duration = end - start

    if duration <= 0:
        return []

    visemes = text_to_visemes(word)

    if not visemes:
        return []

    # Weight vowels somewhat more heavily because vowel mouth shapes tend
    # to be visually dominant.
    weights: List[float] = []

    for viseme in visemes:
        if viseme in {
            "AA",
            "AH",
            "EH",
            "IH",
            "IY",
            "OW",
            "UW",
            "UH",
        }:
            weights.append(1.25)
        elif viseme == "REST":
            weights.append(0.25)
        else:
            weights.append(0.75)

    total_weight = sum(weights)

    if total_weight <= 0:
        total_weight = float(len(visemes))

    cursor = start

    result: List[Dict[str, Any]] = []

    for index, viseme in enumerate(visemes):
        portion = (
            duration
            * weights[index]
            / total_weight
        )

        event_end = (
            end
            if index == len(visemes) - 1
            else cursor + portion
        )

        if event_end <= cursor:
            continue

        result.append(
            {
                "time": round(cursor, 4),
                "viseme": viseme,
                "duration": round(
                    event_end - cursor,
                    4,
                ),
                "weight": 0.85,
                "source": "word_alignment",
                "word": word,
            }
        )

        cursor = event_end

    return result


def build_from_word_alignment(
    words: Sequence[TimedWord],
    total_duration: float,
) -> List[Dict[str, Any]]:
    timeline: List[Dict[str, Any]] = []

    previous_end = 0.0

    for word in words:
        start = clamp(
            word.start,
            0.0,
            total_duration,
        )

        end = clamp(
            word.end,
            start,
            total_duration,
        )

        if end <= start:
            continue

        if start > previous_end + 0.015:
            timeline.append(
                {
                    "time": round(previous_end, 4),
                    "viseme": REST,
                    "duration": round(
                        start - previous_end,
                        4,
                    ),
                    "weight": 0.0,
                    "source": "word_alignment",
                }
            )

        timeline.extend(
            estimate_visemes_inside_word(
                word.word,
                start,
                end,
            )
        )

        previous_end = max(
            previous_end,
            end,
        )

    if previous_end < total_duration:
        timeline.append(
            {
                "time": round(previous_end, 4),
                "viseme": REST,
                "duration": round(
                    total_duration - previous_end,
                    4,
                ),
                "weight": 0.0,
                "source": "word_alignment",
            }
        )

    return merge_adjacent_visemes(timeline)


# ---------------------------------------------------------------------------
# AUDIO-ACTIVITY FALLBACK
# ---------------------------------------------------------------------------

def build_from_audio_regions(
    text: str,
    speech_regions: Sequence[SpeechRegion],
    total_duration: float,
) -> List[Dict[str, Any]]:
    """
    Uses actual audio speech regions as timing anchors.

    This does NOT identify phonemes.

    It is therefore a fallback between true alignment and pure text timing.
    """

    if not speech_regions:
        return []

    words = re.findall(
        r"[A-Za-z']+",
        text,
    )

    if not words:
        return []

    timeline: List[Dict[str, Any]] = []

    word_index = 0

    for region in speech_regions:
        if word_index >= len(words):
            break

        remaining_words = len(words) - word_index
        remaining_regions = len(speech_regions) - speech_regions.index(region)

        # Approximate number of words for this speech region.
        region_word_count = max(
            1,
            round(
                remaining_words
                / max(1, remaining_regions)
            ),
        )

        region_words = words[
            word_index:
            word_index + region_word_count
        ]

        word_index += len(region_words)

        if not region_words:
            continue

        region_duration = max(
            0.03,
            region.end - region.start,
        )

        # Weight words by approximate character count.
        char_weights = [
            max(1, len(word))
            for word in region_words
        ]

        total_weight = sum(char_weights)

        cursor = region.start

        for i, word in enumerate(region_words):
            word_duration = (
                region_duration
                * char_weights[i]
                / total_weight
            )

            word_end = (
                region.end
                if i == len(region_words) - 1
                else min(
                    region.end,
                    cursor + word_duration,
                )
            )

            timeline.extend(
                estimate_visemes_inside_word(
                    word,
                    cursor,
                    word_end,
                )
            )

            cursor = word_end

    if not timeline:
        return []

    # Add REST before/after detected speech.
    first_time = timeline[0]["time"]

    if first_time > 0.01:
        timeline.insert(
            0,
            {
                "time": 0.0,
                "viseme": REST,
                "duration": round(
                    first_time,
                    4,
                ),
                "weight": 0.0,
                "source": "audio_activity",
            },
        )

    last_end = max(
        event["time"] + event["duration"]
        for event in timeline
    )

    if last_end < total_duration:
        timeline.append(
            {
                "time": round(last_end, 4),
                "viseme": REST,
                "duration": round(
                    total_duration - last_end,
                    4,
                ),
                "weight": 0.0,
                "source": "audio_activity",
            }
        )

    return merge_adjacent_visemes(timeline)


# ---------------------------------------------------------------------------
# EMERGENCY TEXT/DURATION FALLBACK
# ---------------------------------------------------------------------------

def build_text_duration_fallback(
    text: str,
    duration: float,
) -> List[Dict[str, Any]]:
    """
    Emergency fallback only.

    This retains compatibility with systems that provide only:

        text + total duration

    It is intentionally clearly marked as an approximation.
    """

    tokens = re.findall(
        r"[A-Za-z']+|[.,!?;:]",
        text,
    )

    if not tokens:
        return [
            {
                "time": 0.0,
                "viseme": REST,
                "duration": duration,
                "weight": 0.0,
                "source": "text_duration_fallback",
            }
        ]

    weighted_items: List[
        Tuple[str, Optional[List[str]], float]
    ] = []

    for token in tokens:
        if token in {".", "!", "?"}:
            weighted_items.append(
                ("pause", None, 0.22)
            )
            continue

        if token in {",", ";", ":"}:
            weighted_items.append(
                ("pause", None, 0.12)
            )
            continue

        visemes = text_to_visemes(token)

        weight = max(
            0.15,
            len(token) * 0.035
            + len(visemes) * 0.075,
        )

        weighted_items.append(
            ("word", visemes, weight)
        )

    total_weight = sum(
        item[2]
        for item in weighted_items
    )

    if total_weight <= 0:
        total_weight = 1.0

    cursor = 0.0

    timeline: List[Dict[str, Any]] = []

    for kind, visemes, weight in weighted_items:
        item_duration = (
            duration
            * weight
            / total_weight
        )

        if kind == "pause":
            timeline.append(
                {
                    "time": round(cursor, 4),
                    "viseme": REST,
                    "duration": round(
                        item_duration,
                        4,
                    ),
                    "weight": 0.0,
                    "source": "text_duration_fallback",
                }
            )

            cursor += item_duration
            continue

        if not visemes:
            continue

        # Distribute only inside this approximate word interval.
        each_duration = (
            item_duration
            / len(visemes)
        )

        for viseme in visemes:
            timeline.append(
                {
                    "time": round(cursor, 4),
                    "viseme": viseme,
                    "duration": round(
                        each_duration,
                        4,
                    ),
                    "weight": 0.8,
                    "source": "text_duration_fallback",
                }
            )

            cursor += each_duration

    # Force exact end coverage.
    if cursor < duration:
        timeline.append(
            {
                "time": round(cursor, 4),
                "viseme": REST,
                "duration": round(
                    duration - cursor,
                    4,
                ),
                "weight": 0.0,
                "source": "text_duration_fallback",
            }
        )

    return merge_adjacent_visemes(timeline)


# ---------------------------------------------------------------------------
# TIMELINE NORMALIZATION
# ---------------------------------------------------------------------------

def merge_adjacent_visemes(
    timeline: Sequence[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Merges identical adjacent visemes.

    This reduces unnecessary frame switching.
    """

    if not timeline:
        return []

    result: List[Dict[str, Any]] = []

    for raw in timeline:
        event = dict(raw)

        if event.get("duration", 0) <= 0:
            continue

        if not result:
            result.append(event)
            continue

        previous = result[-1]

        previous_end = (
            float(previous["time"])
            + float(previous["duration"])
        )

        current_start = float(
            event["time"]
        )

        # Small timestamp rounding gaps are treated as contiguous.
        contiguous = abs(
            current_start - previous_end
        ) <= 0.003

        if (
            contiguous
            and previous.get("viseme")
            == event.get("viseme")
        ):
            previous["duration"] = round(
                float(previous["duration"])
                + float(event["duration"]),
                4,
            )

            previous["weight"] = max(
                float(previous.get("weight", 0.0)),
                float(event.get("weight", 0.0)),
            )

        else:
            result.append(event)

    return result


def normalize_timeline(
    timeline: Sequence[Dict[str, Any]],
    duration: float,
) -> List[Dict[str, Any]]:
    """
    Ensures:

    - sorted timestamps
    - no negative durations
    - no events beyond audio duration
    - no accidental gaps
    - REST after speech
    """

    if duration <= 0:
        duration = 0.01

    events: List[Dict[str, Any]] = []

    for raw in timeline:
        try:
            start = float(raw.get("time", 0.0))
            event_duration = float(
                raw.get("duration", 0.0)
            )
        except (TypeError, ValueError):
            continue

        if event_duration <= 0:
            continue

        start = clamp(
            start,
            0.0,
            duration,
        )

        end = clamp(
            start + event_duration,
            start,
            duration,
        )

        if end <= start:
            continue

        event = dict(raw)

        event["time"] = round(start, 4)
        event["duration"] = round(
            end - start,
            4,
        )

        events.append(event)

    events.sort(
        key=lambda item: item["time"]
    )

    if not events:
        return [
            {
                "time": 0.0,
                "viseme": REST,
                "duration": duration,
                "weight": 0.0,
                "source": "empty",
            }
        ]

    normalized: List[Dict[str, Any]] = []

    cursor = 0.0

    for event in events:
        start = float(event["time"])
        end = start + float(
            event["duration"]
        )

        # Fill genuine gaps with REST.
        if start > cursor + 0.01:
            normalized.append(
                {
                    "time": round(cursor, 4),
                    "viseme": REST,
                    "duration": round(
                        start - cursor,
                        4,
                    ),
                    "weight": 0.0,
                    "source": "gap_fill",
                }
            )

        # Prevent overlap.
        if start < cursor:
            start = cursor

        if end <= start:
            continue

        event["time"] = round(
            start,
            4,
        )

        event["duration"] = round(
            min(end, duration) - start,
            4,
        )

        if event["duration"] <= 0:
            continue

        normalized.append(event)

        cursor = start + event["duration"]

    if cursor < duration:
        normalized.append(
            {
                "time": round(cursor, 4),
                "viseme": REST,
                "duration": round(
                    duration - cursor,
                    4,
                ),
                "weight": 0.0,
                "source": "final_rest",
            }
        )

    return merge_adjacent_visemes(
        normalized
    )


# ---------------------------------------------------------------------------
# MAIN TIMELINE GENERATOR
# ---------------------------------------------------------------------------

def generate_viseme_timeline(
    text: str,
    duration: float,
    audio_base64: str = "",
    sample_rate: int = 24000,
    phonemes: Any = None,
    alignment: Any = None,
    words: Any = None,
) -> List[Dict[str, Any]]:
    """
    Generates the best available viseme timeline.

    Priority:

        1. Explicit phoneme alignment
        2. Explicit generic alignment
        3. Word alignment
        4. Audio speech regions
        5. Text-duration fallback
    """

    duration = max(
        0.01,
        float(duration),
    )

    # ---------------------------------------------------------------
    # 1. TRUE PHONEME ALIGNMENT
    # ---------------------------------------------------------------

    phoneme_data = (
        phonemes
        if phonemes is not None
        else alignment
    )

    parsed_phonemes = parse_phoneme_alignment(
        phoneme_data
    )

    if parsed_phonemes:
        return normalize_timeline(
            build_from_phoneme_alignment(
                parsed_phonemes,
                duration,
            ),
            duration,
        )

    # ---------------------------------------------------------------
    # 2. WORD ALIGNMENT
    # ---------------------------------------------------------------

    parsed_words = parse_word_alignment(
        words
    )

    if parsed_words:
        return normalize_timeline(
            build_from_word_alignment(
                parsed_words,
                duration,
            ),
            duration,
        )

    # ---------------------------------------------------------------
    # 3. ACTUAL AUDIO SPEECH ACTIVITY
    # ---------------------------------------------------------------

    samples, actual_sample_rate = (
        decode_audio_base64(
            audio_base64,
            sample_rate,
        )
    )

    if samples:
        envelope = compute_audio_envelope(
            samples,
            actual_sample_rate,
            hop_size=240,
            window_size=480,
        )

        speech_regions = detect_speech_regions(
            envelope,
            actual_sample_rate,
            hop_size=240,
        )

        if speech_regions:
            timeline = build_from_audio_regions(
                text,
                speech_regions,
                duration,
            )

            if timeline:
                return normalize_timeline(
                    timeline,
                    duration,
                )

    # ---------------------------------------------------------------
    # 4. LAST-RESORT TEXT/DURATION FALLBACK
    # ---------------------------------------------------------------

    return normalize_timeline(
        build_text_duration_fallback(
            text,
            duration,
        ),
        duration,
    )


# ---------------------------------------------------------------------------
# METADATA / QUALITY REPORT
# ---------------------------------------------------------------------------

def determine_alignment_source(
    phonemes: Any,
    alignment: Any,
    words: Any,
    audio_base64: str,
) -> str:
    if parse_phoneme_alignment(
        phonemes if phonemes is not None else alignment
    ):
        return "phoneme_alignment"

    if parse_word_alignment(words):
        return "word_alignment"

    if audio_base64:
        return "audio_activity"

    return "text_duration_fallback"


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == "--stdin":
        payload_string = sys.stdin.read()

    elif len(sys.argv) > 1:
        payload_string = sys.argv[1]

    else:
        payload_string = "{}"

    try:
        data = json.loads(
            payload_string
        )

    except Exception as exc:
        print(
            json.dumps(
                {
                    "success": False,
                    "error": (
                        f"JSON parse error: {exc}"
                    ),
                }
            )
        )
        sys.exit(1)

    if not isinstance(data, dict):
        print(
            json.dumps(
                {
                    "success": False,
                    "error": "Input must be a JSON object.",
                }
            )
        )
        sys.exit(1)

    text = str(
        data.get("text", "")
    )

    try:
        duration = float(
            data.get("duration", 0.0)
        )
    except (TypeError, ValueError):
        duration = 0.0

    duration = max(
        0.01,
        duration,
    )

    audio_base64 = str(
        data.get("audioBase64", "")
        or ""
    )

    try:
        sample_rate = int(
            data.get(
                "sampleRate",
                24000,
            )
        )
    except (TypeError, ValueError):
        sample_rate = 24000

    # Accept several possible alignment field names.
    phonemes = data.get(
        "phonemes",
        data.get("phonemeAlignment"),
    )

    alignment = data.get(
        "alignment",
        data.get("timing"),
    )

    words = data.get(
        "words",
        data.get("wordAlignment"),
    )

    source = determine_alignment_source(
        phonemes,
        alignment,
        words,
        audio_base64,
    )

    timeline = generate_viseme_timeline(
        text=text,
        duration=duration,
        audio_base64=audio_base64,
        sample_rate=sample_rate,
        phonemes=phonemes,
        alignment=alignment,
        words=words,
    )

    print(
        json.dumps(
            {
                "success": True,
                "duration": duration,
                "alignmentSource": source,
                "visemes": timeline,
                "totalVisemes": len(timeline),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()