#!/usr/bin/env python3
"""
KYRSTEN Avatar Animation Atlas Slicer & Alpha-Aware Preprocessor
Python 3.10+

Extracts animation assets from the Kyrsten animation atlas.

Goals:
    - Preserve the original artwork.
    - Remove ONLY the atlas/background pixels.
    - Preserve dark hair and dark facial details.
    - Preserve cyan/blue holographic glow.
    - Produce transparent PNG assets.
    - Keep every extracted frame deterministic.
    - Validate crop coordinates.
    - Avoid destructive luminance-only background removal.

No external dependencies required.

Usage:
    python avatar_atlas_slicer.py
    python avatar_atlas_slicer.py path/to/atlas.png
    python avatar_atlas_slicer.py path/to/atlas.png public/avatar
"""

from __future__ import annotations

import json
import math
import os
import struct
import sys
import zlib

from collections import deque
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


# ============================================================================
# CONSTANTS
# ============================================================================

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

DEFAULT_ATLAS = "public/avatar/atlas.png"
DEFAULT_OUTPUT = "public/avatar"

# Background in the supplied atlas is predominantly very dark blue/navy.
#
# IMPORTANT:
# Do NOT use luminance alone for background removal.
#
# Kyrsten's hair and other legitimate foreground elements can also be dark.
#
# The background remover therefore uses:
#   - border/background colour sampling
#   - colour distance
#   - connected-region information
#   - soft alpha transitions
#
# rather than simply deleting all dark pixels.


# ============================================================================
# PNG DECODER
# ============================================================================

def paeth_predictor(
    a: int,
    b: int,
    c: int,
) -> int:
    """
    PNG Paeth predictor.
    """

    p = a + b - c

    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)

    if pa <= pb and pa <= pc:
        return a

    if pb <= pc:
        return b

    return c


def unfilter_png_row(
    filter_type: int,
    row: bytearray,
    previous: bytearray,
    bytes_per_pixel: int,
) -> bytearray:
    """
    Reconstructs a PNG scanline after PNG filtering.
    """

    result = bytearray(len(row))

    for i, raw_value in enumerate(row):

        left = (
            result[i - bytes_per_pixel]
            if i >= bytes_per_pixel
            else 0
        )

        up = (
            previous[i]
            if previous
            else 0
        )

        up_left = (
            previous[i - bytes_per_pixel]
            if previous and i >= bytes_per_pixel
            else 0
        )

        if filter_type == 0:
            value = raw_value

        elif filter_type == 1:
            value = (
                raw_value
                + left
            ) & 0xFF

        elif filter_type == 2:
            value = (
                raw_value
                + up
            ) & 0xFF

        elif filter_type == 3:
            value = (
                raw_value
                + ((left + up) >> 1)
            ) & 0xFF

        elif filter_type == 4:
            value = (
                raw_value
                + paeth_predictor(
                    left,
                    up,
                    up_left,
                )
            ) & 0xFF

        else:
            raise ValueError(
                f"Unsupported PNG filter type: {filter_type}"
            )

        result[i] = value

    return result


def parse_png(
    file_bytes: bytes,
) -> Tuple[int, int, bytearray]:
    """
    Decode a non-interlaced 8-bit PNG into RGBA.

    Supports:
        - RGB
        - RGBA

    The avatar atlas is expected to be one of these formats.
    """

    if not file_bytes.startswith(PNG_SIGNATURE):
        raise ValueError(
            "Input is not a valid PNG file."
        )

    offset = len(PNG_SIGNATURE)

    width = 0
    height = 0
    bit_depth = 0
    color_type = 0
    interlace = 0

    idat_chunks: List[bytes] = []

    while offset < len(file_bytes):

        if offset + 8 > len(file_bytes):
            raise ValueError(
                "Truncated PNG chunk header."
            )

        length, chunk_type = struct.unpack(
            ">I4s",
            file_bytes[
                offset:
                offset + 8
            ],
        )

        offset += 8

        if offset + length + 4 > len(file_bytes):
            raise ValueError(
                "Truncated PNG chunk."
            )

        data = file_bytes[
            offset:
            offset + length
        ]

        offset += length

        # Skip CRC.
        offset += 4

        if chunk_type == b"IHDR":

            if len(data) != 13:
                raise ValueError(
                    "Invalid PNG IHDR."
                )

            (
                width,
                height,
                bit_depth,
                color_type,
                compression,
                filter_method,
                interlace,
            ) = struct.unpack(
                ">IIBBBBB",
                data,
            )

            if bit_depth != 8:
                raise ValueError(
                    f"Only 8-bit PNGs are supported; got {bit_depth}-bit."
                )

            if compression != 0:
                raise ValueError(
                    "Unsupported PNG compression method."
                )

            if filter_method != 0:
                raise ValueError(
                    "Unsupported PNG filter method."
                )

            if interlace != 0:
                raise ValueError(
                    "Interlaced PNGs are not supported."
                )

            if color_type not in (2, 6):
                raise ValueError(
                    "Only RGB and RGBA PNGs are supported."
                )

        elif chunk_type == b"IDAT":

            idat_chunks.append(data)

        elif chunk_type == b"IEND":

            break

    if width <= 0 or height <= 0:
        raise ValueError(
            "Invalid PNG dimensions."
        )

    compressed = b"".join(
        idat_chunks
    )

    if not compressed:
        raise ValueError(
            "PNG contains no image data."
        )

    decompressed = zlib.decompress(
        compressed
    )

    bytes_per_pixel = (
        4
        if color_type == 6
        else 3
    )

    stride = (
        width
        * bytes_per_pixel
    )

    expected_size = (
        height
        * (stride + 1)
    )

    if len(decompressed) < expected_size:
        raise ValueError(
            "PNG image data is incomplete."
        )

    rgba = bytearray(
        width
        * height
        * 4
    )

    input_index = 0
    output_index = 0

    previous_row = bytearray(
        stride
    )

    for _y in range(height):

        filter_type = decompressed[
            input_index
        ]

        input_index += 1

        raw_row = bytearray(
            decompressed[
                input_index:
                input_index + stride
            ]
        )

        input_index += stride

        row = unfilter_png_row(
            filter_type,
            raw_row,
            previous_row,
            bytes_per_pixel,
        )

        for x in range(width):

            src = (
                x
                * bytes_per_pixel
            )

            r = row[src]
            g = row[src + 1]
            b = row[src + 2]

            if color_type == 6:
                a = row[src + 3]
            else:
                a = 255

            rgba[output_index] = r
            rgba[output_index + 1] = g
            rgba[output_index + 2] = b
            rgba[output_index + 3] = a

            output_index += 4

        previous_row = row

    return width, height, rgba


# ============================================================================
# PNG ENCODER
# ============================================================================

def make_png(
    width: int,
    height: int,
    rgba_bytes: bytearray,
) -> bytes:
    """
    Encode RGBA pixels into a standard non-interlaced PNG.
    """

    if width <= 0 or height <= 0:
        raise ValueError(
            "PNG dimensions must be positive."
        )

    expected = (
        width
        * height
        * 4
    )

    if len(rgba_bytes) != expected:
        raise ValueError(
            "RGBA buffer has incorrect size."
        )

    def chunk(
        chunk_type: bytes,
        data: bytes,
    ) -> bytes:

        return (
            struct.pack(
                ">I",
                len(data),
            )
            + chunk_type
            + data
            + struct.pack(
                ">I",
                zlib.crc32(
                    chunk_type + data
                ) & 0xFFFFFFFF,
            )
        )

    ihdr = struct.pack(
        ">IIBBBBB",
        width,
        height,
        8,
        6,
        0,
        0,
        0,
    )

    scanlines = bytearray()

    row_stride = width * 4

    for y in range(height):

        scanlines.append(0)

        start = (
            y
            * row_stride
        )

        scanlines.extend(
            rgba_bytes[
                start:
                start + row_stride
            ]
        )

    compressed = zlib.compress(
        bytes(scanlines),
        level=6,
    )

    return (
        PNG_SIGNATURE
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", compressed)
        + chunk(b"IEND", b"")
    )


# ============================================================================
# COLOUR UTILITIES
# ============================================================================

def rgb_distance(
    a: Tuple[int, int, int],
    b: Tuple[int, int, int],
) -> float:
    """
    Euclidean RGB distance.

    Good enough for atlas background separation because the atlas uses
    a strongly contrasting background.
    """

    dr = a[0] - b[0]
    dg = a[1] - b[1]
    db = a[2] - b[2]

    return math.sqrt(
        dr * dr
        + dg * dg
        + db * db
    )


def color_luminance(
    r: int,
    g: int,
    b: int,
) -> float:
    return (
        0.299 * r
        + 0.587 * g
        + 0.114 * b
    )


def saturation(
    r: int,
    g: int,
    b: int,
) -> float:
    maximum = max(r, g, b)
    minimum = min(r, g, b)

    if maximum == 0:
        return 0.0

    return (
        maximum - minimum
    ) / maximum


# ============================================================================
# ATLAS MANIFEST
# ============================================================================

ATLAS_MANIFEST: Dict[str, Dict[str, Any]] = {

    # ------------------------------------------------------------------------
    # 1. Base portrait
    # ------------------------------------------------------------------------

    "base/kyrsten_idle_000.png": {
        "x": 0.018,
        "y": 0.055,
        "w": 0.185,
        "h": 0.300,
        "mode": "full",
    },

    # ------------------------------------------------------------------------
    # 2. Idle animation
    # ------------------------------------------------------------------------

    "idle/idle_001.png": {
        "x": 0.220,
        "y": 0.052,
        "w": 0.062,
        "h": 0.155,
        "mode": "full",
    },

    "idle/idle_002.png": {
        "x": 0.286,
        "y": 0.052,
        "w": 0.062,
        "h": 0.155,
        "mode": "full",
    },

    "idle/idle_003.png": {
        "x": 0.352,
        "y": 0.052,
        "w": 0.062,
        "h": 0.155,
        "mode": "full",
    },

    "idle/idle_004.png": {
        "x": 0.418,
        "y": 0.052,
        "w": 0.062,
        "h": 0.155,
        "mode": "full",
    },

    "idle/idle_005.png": {
        "x": 0.484,
        "y": 0.052,
        "w": 0.062,
        "h": 0.155,
        "mode": "full",
    },

    "idle/idle_006.png": {
        "x": 0.550,
        "y": 0.052,
        "w": 0.062,
        "h": 0.155,
        "mode": "full",
    },

    "idle/idle_007.png": {
        "x": 0.616,
        "y": 0.052,
        "w": 0.062,
        "h": 0.155,
        "mode": "full",
    },

    "idle/idle_008.png": {
        "x": 0.682,
        "y": 0.052,
        "w": 0.062,
        "h": 0.155,
        "mode": "full",
    },

    # ------------------------------------------------------------------------
    # 3. Head movement
    # ------------------------------------------------------------------------

    "head/look_left.png": {
        "x": 0.762,
        "y": 0.052,
        "w": 0.072,
        "h": 0.155,
        "mode": "full",
    },

    "head/look_center.png": {
        "x": 0.838,
        "y": 0.052,
        "w": 0.072,
        "h": 0.155,
        "mode": "full",
    },

    "head/look_right.png": {
        "x": 0.914,
        "y": 0.052,
        "w": 0.072,
        "h": 0.155,
        "mode": "full",
    },

    # ------------------------------------------------------------------------
    # 4. Visemes
    # ------------------------------------------------------------------------

    "visemes/viseme_rest.png": {
        "x": 0.220,
        "y": 0.278,
        "w": 0.055,
        "h": 0.075,
        "mode": "detail",
    },

    "visemes/viseme_mb_p.png": {
        "x": 0.279,
        "y": 0.278,
        "w": 0.055,
        "h": 0.075,
        "mode": "detail",
    },

    "visemes/viseme_f_v.png": {
        "x": 0.338,
        "y": 0.278,
        "w": 0.055,
        "h": 0.075,
        "mode": "detail",
    },

    "visemes/viseme_s_z.png": {
        "x": 0.397,
        "y": 0.278,
        "w": 0.055,
        "h": 0.075,
        "mode": "detail",
    },

    "visemes/viseme_sh_ch.png": {
        "x": 0.456,
        "y": 0.278,
        "w": 0.055,
        "h": 0.075,
        "mode": "detail",
    },

    "visemes/viseme_aa.png": {
        "x": 0.515,
        "y": 0.278,
        "w": 0.055,
        "h": 0.075,
        "mode": "detail",
    },

    "visemes/viseme_ah.png": {
        "x": 0.574,
        "y": 0.278,
        "w": 0.055,
        "h": 0.075,
        "mode": "detail",
    },

    "visemes/viseme_ah_wide.png": {
        "x": 0.633,
        "y": 0.278,
        "w": 0.055,
        "h": 0.075,
        "mode": "detail",
    },

    "visemes/viseme_ih.png": {
        "x": 0.692,
        "y": 0.278,
        "w": 0.055,
        "h": 0.075,
        "mode": "detail",
    },

    "visemes/viseme_ih_wide.png": {
        "x": 0.751,
        "y": 0.278,
        "w": 0.055,
        "h": 0.075,
        "mode": "detail",
    },

    "visemes/viseme_iy.png": {
        "x": 0.810,
        "y": 0.278,
        "w": 0.055,
        "h": 0.075,
        "mode": "detail",
    },

    "visemes/viseme_oo.png": {
        "x": 0.869,
        "y": 0.278,
        "w": 0.055,
        "h": 0.075,
        "mode": "detail",
    },

    "visemes/viseme_ow.png": {
        "x": 0.928,
        "y": 0.278,
        "w": 0.055,
        "h": 0.075,
        "mode": "detail",
    },

    # ------------------------------------------------------------------------
    # 5. Eyes
    # ------------------------------------------------------------------------

    "eyes/eye_open.png": {
        "x": 0.018,
        "y": 0.425,
        "w": 0.057,
        "h": 0.105,
        "mode": "detail",
    },

    "eyes/eye_half.png": {
        "x": 0.079,
        "y": 0.425,
        "w": 0.057,
        "h": 0.105,
        "mode": "detail",
    },

    "eyes/eye_closed.png": {
        "x": 0.140,
        "y": 0.425,
        "w": 0.057,
        "h": 0.105,
        "mode": "detail",
    },

    "eyes/blink_01.png": {
        "x": 0.201,
        "y": 0.425,
        "w": 0.057,
        "h": 0.105,
        "mode": "detail",
    },

    "eyes/blink_02.png": {
        "x": 0.262,
        "y": 0.425,
        "w": 0.057,
        "h": 0.105,
        "mode": "detail",
    },

    "eyes/blink_03.png": {
        "x": 0.323,
        "y": 0.425,
        "w": 0.057,
        "h": 0.105,
        "mode": "detail",
    },

    "eyes/blink_04.png": {
        "x": 0.384,
        "y": 0.425,
        "w": 0.057,
        "h": 0.105,
        "mode": "detail",
    },

    "eyes/blink_05.png": {
        "x": 0.445,
        "y": 0.425,
        "w": 0.057,
        "h": 0.105,
        "mode": "detail",
    },

    # ------------------------------------------------------------------------
    # 6. Expressions
    # ------------------------------------------------------------------------

    "expressions/neutral.png": {
        "x": 0.518,
        "y": 0.420,
        "w": 0.056,
        "h": 0.120,
        "mode": "full",
    },

    "expressions/happy.png": {
        "x": 0.577,
        "y": 0.420,
        "w": 0.056,
        "h": 0.120,
        "mode": "full",
    },

    "expressions/amused.png": {
        "x": 0.636,
        "y": 0.420,
        "w": 0.056,
        "h": 0.120,
        "mode": "full",
    },

    "expressions/curious.png": {
        "x": 0.695,
        "y": 0.420,
        "w": 0.056,
        "h": 0.120,
        "mode": "full",
    },

    "expressions/concerned.png": {
        "x": 0.754,
        "y": 0.420,
        "w": 0.056,
        "h": 0.120,
        "mode": "full",
    },

    "expressions/surprised.png": {
        "x": 0.813,
        "y": 0.420,
        "w": 0.056,
        "h": 0.120,
        "mode": "full",
    },

    "expressions/serious.png": {
        "x": 0.872,
        "y": 0.420,
        "w": 0.056,
        "h": 0.120,
        "mode": "full",
    },

    "expressions/sad.png": {
        "x": 0.931,
        "y": 0.420,
        "w": 0.056,
        "h": 0.120,
        "mode": "full",
    },

    # ------------------------------------------------------------------------
    # 7. Speaking
    # ------------------------------------------------------------------------

    "speaking/speak_001.png": {
        "x": 0.018,
        "y": 0.608,
        "w": 0.058,
        "h": 0.135,
        "mode": "full",
    },

    "speaking/speak_002.png": {
        "x": 0.080,
        "y": 0.608,
        "w": 0.058,
        "h": 0.135,
        "mode": "full",
    },

    "speaking/speak_003.png": {
        "x": 0.142,
        "y": 0.608,
        "w": 0.058,
        "h": 0.135,
        "mode": "full",
    },

    "speaking/speak_004.png": {
        "x": 0.204,
        "y": 0.608,
        "w": 0.058,
        "h": 0.135,
        "mode": "full",
    },

    "speaking/speak_005.png": {
        "x": 0.266,
        "y": 0.608,
        "w": 0.058,
        "h": 0.135,
        "mode": "full",
    },

    "speaking/speak_006.png": {
        "x": 0.328,
        "y": 0.608,
        "w": 0.058,
        "h": 0.135,
        "mode": "full",
    },

    "speaking/speak_007.png": {
        "x": 0.390,
        "y": 0.608,
        "w": 0.058,
        "h": 0.135,
        "mode": "full",
    },

    "speaking/speak_008.png": {
        "x": 0.452,
        "y": 0.608,
        "w": 0.058,
        "h": 0.135,
        "mode": "full",
    },

    # ------------------------------------------------------------------------
    # 8. Emotional transitions
    # ------------------------------------------------------------------------

    "transitions/smile_start.png": {
        "x": 0.605,
        "y": 0.608,
        "w": 0.070,
        "h": 0.135,
        "mode": "full",
    },

    "transitions/smile_end.png": {
        "x": 0.682,
        "y": 0.608,
        "w": 0.070,
        "h": 0.135,
        "mode": "full",
    },

    "transitions/concern_start.png": {
        "x": 0.836,
        "y": 0.608,
        "w": 0.070,
        "h": 0.135,
        "mode": "full",
    },

    "transitions/concern_end.png": {
        "x": 0.913,
        "y": 0.608,
        "w": 0.070,
        "h": 0.135,
        "mode": "full",
    },

    # ------------------------------------------------------------------------
    # 9. Overlay assets
    # ------------------------------------------------------------------------

    "overlays/hologram_glow.png": {
        "x": 0.020,
        "y": 0.820,
        "w": 0.092,
        "h": 0.125,
        "mode": "overlay",
    },

    "overlays/scanlines.png": {
        "x": 0.118,
        "y": 0.820,
        "w": 0.092,
        "h": 0.125,
        "mode": "overlay",
    },

    "overlays/particles.png": {
        "x": 0.216,
        "y": 0.820,
        "w": 0.092,
        "h": 0.125,
        "mode": "overlay",
    },

    "overlays/hud_frame.png": {
        "x": 0.314,
        "y": 0.820,
        "w": 0.092,
        "h": 0.125,
        "mode": "overlay",
    },

    "overlays/hologram_fade.png": {
        "x": 0.412,
        "y": 0.820,
        "w": 0.092,
        "h": 0.125,
        "mode": "overlay",
    },
}


# ============================================================================
# MANIFEST VALIDATION
# ============================================================================

def validate_manifest() -> None:
    """
    Validates all normalized crop rectangles before touching the atlas.
    """

    for path, coords in ATLAS_MANIFEST.items():

        x = float(coords["x"])
        y = float(coords["y"])
        w = float(coords["w"])
        h = float(coords["h"])

        if x < 0 or y < 0:
            raise ValueError(
                f"Negative atlas coordinate: {path}"
            )

        if w <= 0 or h <= 0:
            raise ValueError(
                f"Invalid atlas dimensions: {path}"
            )

        if x + w > 1.0 + 1e-6:
            raise ValueError(
                f"Atlas crop exceeds width: {path}"
            )

        if y + h > 1.0 + 1e-6:
            raise ValueError(
                f"Atlas crop exceeds height: {path}"
            )


# ============================================================================
# CROP
# ============================================================================

def normalized_crop(
    src_width: int,
    src_height: int,
    src_rgba: bytearray,
    norm_x: float,
    norm_y: float,
    norm_w: float,
    norm_h: float,
) -> Tuple[
    int,
    int,
    bytearray,
]:
    """
    Crop a normalized atlas rectangle.

    Coordinates are clamped safely to image boundaries.
    """

    x0 = int(
        math.floor(
            norm_x
            * src_width
        )
    )

    y0 = int(
        math.floor(
            norm_y
            * src_height
        )
    )

    x1 = int(
        math.ceil(
            (norm_x + norm_w)
            * src_width
        )
    )

    y1 = int(
        math.ceil(
            (norm_y + norm_h)
            * src_height
        )
    )

    x0 = max(
        0,
        min(
            src_width - 1,
            x0,
        ),
    )

    y0 = max(
        0,
        min(
            src_height - 1,
            y0,
        ),
    )

    x1 = max(
        x0 + 1,
        min(
            src_width,
            x1,
        ),
    )

    y1 = max(
        y0 + 1,
        min(
            src_height,
            y1,
        ),
    )

    target_width = x1 - x0
    target_height = y1 - y0

    output = bytearray(
        target_width
        * target_height
        * 4
    )

    destination = 0

    for y in range(
        y0,
        y1,
    ):

        for x in range(
            x0,
            x1,
        ):

            source = (
                (
                    y
                    * src_width
                    + x
                )
                * 4
            )

            output[
                destination:
                destination + 4
            ] = src_rgba[
                source:
                source + 4
            ]

            destination += 4

    return (
        target_width,
        target_height,
        output,
    )


# ============================================================================
# BACKGROUND ESTIMATION
# ============================================================================

def sample_border_colors(
    width: int,
    height: int,
    rgba: bytearray,
    samples_per_edge: int = 24,
) -> List[Tuple[int, int, int]]:
    """
    Samples the crop boundary.

    The border is assumed to contain mostly atlas background.

    We intentionally don't assume that the background is pure black.
    """

    colors: List[
        Tuple[int, int, int]
    ] = []

    if width <= 0 or height <= 0:
        return colors

    xs = [
        int(
            round(
                i
                * (width - 1)
                / max(
                    1,
                    samples_per_edge - 1,
                )
            )
        )
        for i in range(
            samples_per_edge
        )
    ]

    ys = [
        int(
            round(
                i
                * (height - 1)
                / max(
                    1,
                    samples_per_edge - 1,
                )
            )
        )
        for i in range(
            samples_per_edge
        )
    ]

    coordinates = set()

    for x in xs:
        coordinates.add(
            (x, 0)
        )
        coordinates.add(
            (x, height - 1)
        )

    for y in ys:
        coordinates.add(
            (0, y)
        )
        coordinates.add(
            (width - 1, y)
        )

    for x, y in coordinates:

        index = (
            (
                y
                * width
                + x
            )
            * 4
        )

        colors.append(
            (
                rgba[index],
                rgba[index + 1],
                rgba[index + 2],
            )
        )

    return colors


def estimate_background_color(
    colors: Sequence[
        Tuple[int, int, int]
    ],
) -> Tuple[int, int, int]:
    """
    Estimates the dominant background colour from border samples.

    We favour darker, low-saturation colours because the atlas background is
    dark navy/blue rather than bright cyan.

    This is intentionally NOT based on a single pixel.
    """

    if not colors:
        return (
            8,
            18,
            32,
        )

    weighted = []

    for color in colors:

        r, g, b = color

        lum = color_luminance(
            r,
            g,
            b,
        )

        sat = saturation(
            r,
            g,
            b,
        )

        # Dark colours are more likely to be background.
        score = (
            (255.0 - lum)
            + (1.0 - sat) * 40.0
        )

        weighted.append(
            (
                score,
                color,
            )
        )

    weighted.sort(
        key=lambda item: item[0],
        reverse=True,
    )

    # Use the darkest portion rather than allowing a bright avatar edge
    # to dominate the estimate.
    selected = [
        color
        for _, color
        in weighted[
            :max(
                1,
                len(weighted) // 3,
            ):
        ]
    ]

    if not selected:
        selected = list(
            colors
        )

    return (
        int(
            round(
                sum(
                    c[0]
                    for c in selected
                )
                / len(selected)
            )
        ),
        int(
            round(
                sum(
                    c[1]
                    for c in selected
                )
                / len(selected)
            )
        ),
        int(
            round(
                sum(
                    c[2]
                    for c in selected
                )
                / len(selected)
            )
        ),
    )


# ============================================================================
# BACKGROUND MATTE
# ============================================================================

def compute_background_alpha(
    color: Tuple[int, int, int],
    background: Tuple[int, int, int],
) -> float:
    """
    Determines how much of a pixel should remain opaque.

    Returns:
        0.0 -> background
        1.0 -> foreground

    This is deliberately conservative.

    DARK FOREGROUND IS PRESERVED.

    A pixel is not deleted merely because it is dark.

    Instead, the decision is based primarily on similarity to the sampled
    background colour.
    """

    distance = rgb_distance(
        color,
        background,
    )

    r, g, b = color

    lum = color_luminance(
        r,
        g,
        b,
    )

    sat = saturation(
        r,
        g,
        b,
    )

    # Background similarity thresholds.
    #
    # Pixels extremely close to the background are removed.
    #
    # Pixels moderately similar are partially transparent to preserve
    # holographic glow.
    #
    # Everything sufficiently different remains foreground.

    remove_distance = 10.0
    preserve_distance = 42.0

    if distance <= remove_distance:

        # Very dark/near-background pixels are removed.
        return 0.0

    if distance >= preserve_distance:

        return 1.0

    # Soft transition.
    t = (
        distance
        - remove_distance
    ) / (
        preserve_distance
        - remove_distance
    )

    alpha = t * t * (
        3.0 - 2.0 * t
    )

    # Preserve saturated cyan/blue holographic detail.
    if sat > 0.35 and lum > 18.0:
        alpha = max(
            alpha,
            0.35,
        )

    return max(
        0.0,
        min(
            1.0,
            alpha,
        ),
    )


# ============================================================================
# CONNECTED BACKGROUND REFINEMENT
# ============================================================================

def refine_background_edges(
    width: int,
    height: int,
    rgba: bytearray,
    alpha_mask: List[float],
    background: Tuple[int, int, int],
) -> List[float]:
    """
    Refines pixels that are very likely to belong to the connected atlas
    background.

    This prevents isolated dark foreground details from being deleted.

    IMPORTANT:
    We start ONLY from the crop boundary.

    This means dark hair/facial details inside the avatar are not automatically
    classified as background merely because they are dark.
    """

    total = (
        width
        * height
    )

    if total == 0:
        return alpha_mask

    background_like = bytearray(
        total
    )

    for i in range(total):

        source = i * 4

        color = (
            rgba[source],
            rgba[source + 1],
            rgba[source + 2],
        )

        distance = rgb_distance(
            color,
            background,
        )

        # Conservative threshold.
        if distance <= 24.0:
            background_like[i] = 1

    visited = bytearray(
        total
    )

    queue = deque()

    # Seed ONLY from border.
    for x in range(width):

        top = x
        bottom = (
            (height - 1)
            * width
            + x
        )

        if (
            background_like[top]
            and not visited[top]
        ):
            visited[top] = 1
            queue.append(top)

        if (
            background_like[bottom]
            and not visited[bottom]
        ):
            visited[bottom] = 1
            queue.append(bottom)

    for y in range(height):

        left = y * width
        right = (
            y * width
            + width - 1
        )

        if (
            background_like[left]
            and not visited[left]
        ):
            visited[left] = 1
            queue.append(left)

        if (
            background_like[right]
            and not visited[right]
        ):
            visited[right] = 1
            queue.append(right)

    neighbours = (
        (-1, 0),
        (1, 0),
        (0, -1),
        (0, 1),
    )

    while queue:

        index = queue.popleft()

        y, x = divmod(
            index,
            width,
        )

        for dx, dy in neighbours:

            nx = x + dx
            ny = y + dy

            if (
                nx < 0
                or nx >= width
                or ny < 0
                or ny >= height
            ):
                continue

            neighbour = (
                ny * width
                + nx
            )

            if visited[neighbour]:
                continue

            if not background_like[
                neighbour
            ]:
                continue

            visited[neighbour] = 1
            queue.append(
                neighbour
            )

    # Only connected background is force-removed.
    for i in range(total):

        if not visited[i]:
            continue

        # Keep some soft alpha where a pixel was already considered
        # holographic/foreground.
        alpha_mask[i] = min(
            alpha_mask[i],
            0.05,
        )

    return alpha_mask


# ============================================================================
# APPLY MATTE
# ============================================================================

def apply_background_matte(
    width: int,
    height: int,
    rgba: bytearray,
    preserve_glow: bool = True,
) -> bytearray:
    """
    Creates an alpha-aware transparent foreground.

    The algorithm intentionally preserves dark foreground features.
    """

    if width <= 0 or height <= 0:
        return rgba

    border_colors = sample_border_colors(
        width,
        height,
        rgba,
    )

    background = estimate_background_color(
        border_colors
    )

    total = (
        width
        * height
    )

    alpha_mask = [
        1.0
    ] * total

    for i in range(total):

        source = i * 4

        r = rgba[source]
        g = rgba[source + 1]
        b = rgba[source + 2]
        a = rgba[source + 3]

        if a == 0:
            alpha_mask[i] = 0.0
            continue

        alpha = compute_background_alpha(
            (
                r,
                g,
                b,
            ),
            background,
        )

        alpha_mask[i] = (
            alpha
            * (a / 255.0)
        )

    alpha_mask = refine_background_edges(
        width,
        height,
        rgba,
        alpha_mask,
        background,
    )

    output = bytearray(
        len(rgba)
    )

    for i in range(total):

        source = i * 4

        r = rgba[source]
        g = rgba[source + 1]
        b = rgba[source + 2]

        alpha = alpha_mask[i]

        # Do not modify RGB aggressively.
        #
        # Premultiplying or boosting RGB can create ugly colour halos when
        # composited against different backgrounds.
        #
        # Preserve original artwork RGB values.
        output[source] = r
        output[source + 1] = g
        output[source + 2] = b

        output[source + 3] = int(
            round(
                max(
                    0.0,
                    min(
                        255.0,
                        alpha * 255.0,
                    ),
                )
            )
        )

    return output


# ============================================================================
# CROP TRANSPARENT BORDERS
# ============================================================================

def crop_to_alpha_bounds(
    width: int,
    height: int,
    rgba: bytearray,
    padding: int = 2,
    minimum_alpha: int = 8,
) -> Tuple[
    int,
    int,
    bytearray,
]:
    """
    Crops fully transparent outer borders.

    Padding is retained so hair/glow does not touch the image edge.
    """

    min_x = width
    min_y = height
    max_x = -1
    max_y = -1

    for y in range(height):

        for x in range(width):

            index = (
                (
                    y * width
                    + x
                )
                * 4
            )

            if rgba[index + 3] >= minimum_alpha:

                min_x = min(
                    min_x,
                    x,
                )

                min_y = min(
                    min_y,
                    y,
                )

                max_x = max(
                    max_x,
                    x,
                )

                max_y = max(
                    max_y,
                    y,
                )

    if max_x < 0:
        # Entire image transparent.
        return (
            width,
            height,
            rgba,
        )

    min_x = max(
        0,
        min_x - padding,
    )

    min_y = max(
        0,
        min_y - padding,
    )

    max_x = min(
        width - 1,
        max_x + padding,
    )

    max_y = min(
        height - 1,
        max_y + padding,
    )

    new_width = (
        max_x
        - min_x
        + 1
    )

    new_height = (
        max_y
        - min_y
        + 1
    )

    output = bytearray(
        new_width
        * new_height
        * 4
    )

    destination = 0

    for y in range(
        min_y,
        max_y + 1,
    ):

        for x in range(
            min_x,
            max_x + 1,
        ):

            source = (
                (
                    y * width
                    + x
                )
                * 4
            )

            output[
                destination:
                destination + 4
            ] = rgba[
                source:
                source + 4
            ]

            destination += 4

    return (
        new_width,
        new_height,
        output,
    )


# ============================================================================
# FRAME STATISTICS
# ============================================================================

def frame_statistics(
    width: int,
    height: int,
    rgba: bytearray,
) -> Dict[str, Any]:
    total = (
        width
        * height
    )

    opaque = 0
    visible = 0

    alpha_sum = 0.0

    for i in range(total):

        alpha = rgba[
            i * 4 + 3
        ]

        alpha_sum += alpha

        if alpha > 0:
            visible += 1

        if alpha >= 240:
            opaque += 1

    return {
        "width": width,
        "height": height,
        "pixels": total,
        "visiblePixels": visible,
        "opaquePixels": opaque,
        "visiblePercent": round(
            (
                visible
                / max(
                    1,
                    total,
                )
            )
            * 100.0,
            2,
        ),
        "averageAlpha": round(
            alpha_sum
            / max(
                1,
                total,
            ),
            2,
        ),
    }


# ============================================================================
# FRAME EXTRACTION
# ============================================================================

def extract_frame(
    atlas_width: int,
    atlas_height: int,
    atlas_rgba: bytearray,
    coords: Dict[str, Any],
) -> Tuple[
    int,
    int,
    bytearray,
]:
    """
    Extract and clean one atlas frame.
    """

    width, height, cropped = normalized_crop(
        atlas_width,
        atlas_height,
        atlas_rgba,
        float(coords["x"]),
        float(coords["y"]),
        float(coords["w"]),
        float(coords["h"]),
    )

    mode = coords.get(
        "mode",
        "full",
    )

    # Every atlas crop is processed through the same conservative matte.
    #
    # This is important because even the detail frames may contain the same
    # atlas background.
    cleaned = apply_background_matte(
        width,
        height,
        cropped,
        preserve_glow=True,
    )

    # Remove transparent outer borders.
    #
    # Keep a small amount of padding for glow.
    cleaned_width, cleaned_height, cleaned = (
        crop_to_alpha_bounds(
            width,
            height,
            cleaned,
            padding=2,
        )
    )

    return (
        cleaned_width,
        cleaned_height,
        cleaned,
    )


# ============================================================================
# ATLAS PROCESSING
# ============================================================================

def slice_atlas(
    atlas_path: str = DEFAULT_ATLAS,
    output_base_dir: str = DEFAULT_OUTPUT,
) -> Dict[str, Any]:
    """
    Extracts every asset defined by ATLAS_MANIFEST.
    """

    validate_manifest()

    if not os.path.isfile(
        atlas_path
    ):
        return {
            "success": False,
            "error": (
                f"Atlas file not found: "
                f"{atlas_path}"
            ),
        }

    try:

        with open(
            atlas_path,
            "rb",
        ) as file:

            atlas_bytes = file.read()

        atlas_width, atlas_height, atlas_rgba = parse_png(
            atlas_bytes
        )

    except Exception as exc:

        return {
            "success": False,
            "error": (
                f"Unable to read atlas: "
                f"{exc}"
            ),
        }

    os.makedirs(
        output_base_dir,
        exist_ok=True,
    )

    extracted_frames: List[
        Dict[str, Any]
    ] = []

    failures: List[
        Dict[str, Any]
    ] = []

    for relative_path, coords in ATLAS_MANIFEST.items():

        try:

            width, height, rgba = extract_frame(
                atlas_width,
                atlas_height,
                atlas_rgba,
                coords,
            )

            output_path = os.path.join(
                output_base_dir,
                relative_path,
            )

            output_directory = os.path.dirname(
                output_path
            )

            os.makedirs(
                output_directory,
                exist_ok=True,
            )

            png_bytes = make_png(
                width,
                height,
                rgba,
            )

            with open(
                output_path,
                "wb",
            ) as output_file:

                output_file.write(
                    png_bytes
                )

            stats = frame_statistics(
                width,
                height,
                rgba,
            )

            extracted_frames.append(
                {
                    "name": relative_path,
                    "path": output_path,
                    "width": width,
                    "height": height,
                    "sizeBytes": len(
                        png_bytes
                    ),
                    "mode": coords.get(
                        "mode",
                        "full",
                    ),
                    "statistics": stats,
                }
            )

        except Exception as exc:

            failures.append(
                {
                    "name": relative_path,
                    "error": str(exc),
                }
            )

    # ------------------------------------------------------------------------
    # Manifest generated for runtime.
    # ------------------------------------------------------------------------

    runtime_manifest = {
        "version": 2,
        "sourceAtlas": os.path.basename(
            atlas_path
        ),
        "sourceWidth": atlas_width,
        "sourceHeight": atlas_height,
        "generatedFrames": [
            frame["name"]
            for frame in extracted_frames
        ],
    }

    manifest_path = os.path.join(
        output_base_dir,
        "manifest.json",
    )

    try:

        with open(
            manifest_path,
            "w",
            encoding="utf-8",
        ) as manifest_file:

            json.dump(
                runtime_manifest,
                manifest_file,
                indent=2,
                ensure_ascii=False,
            )

    except Exception as exc:

        failures.append(
            {
                "name": "manifest.json",
                "error": str(exc),
            }
        )

    return {
        "success": len(failures) == 0,
        "sourceAtlas": atlas_path,
        "sourceWidth": atlas_width,
        "sourceHeight": atlas_height,
        "outputDirectory": output_base_dir,
        "totalRequested": len(
            ATLAS_MANIFEST
        ),
        "totalExtracted": len(
            extracted_frames
        ),
        "totalFailed": len(
            failures
        ),
        "frames": extracted_frames,
        "failures": failures,
    }


# ============================================================================
# CLI
# ============================================================================

def main() -> None:

    atlas_path = (
        sys.argv[1]
        if len(sys.argv) > 1
        else DEFAULT_ATLAS
    )

    output_directory = (
        sys.argv[2]
        if len(sys.argv) > 2
        else DEFAULT_OUTPUT
    )

    result = slice_atlas(
        atlas_path,
        output_directory,
    )

    print(
        json.dumps(
            result,
            indent=2,
            ensure_ascii=False,
        )
    )

    if not result.get(
        "success",
        False,
    ):
        sys.exit(1)


if __name__ == "__main__":
    main()