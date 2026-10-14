"""Shrink uploaded photos to web size before they are stored.

Phone and camera originals arrive at 5–8 MB and 4000+ px. A storefront never
shows more than ~2000 px of a product shot, so keeping the original made every
product grid download tens of megabytes. Each image keeps its format (and so
its extension and mime type); only its pixel size and compression change.

Anything Pillow cannot read, or an image that would come out no smaller, is
kept exactly as uploaded — this must never be the reason an upload fails.
"""

from __future__ import annotations

import io
import logging

from PIL import Image, ImageOps

log = logging.getLogger(__name__)

MAX_EDGE_PX = 2000
_SAVE_OPTIONS = {
    "JPEG": {"quality": 82, "optimize": True, "progressive": True},
    "WEBP": {"quality": 82, "method": 6},
    "PNG": {"optimize": True},
    "AVIF": {"quality": 70},
}


def optimise(data: bytes) -> tuple[bytes, int | None, int | None]:
    """(bytes to store, width, height). Width/height are None only when the
    image could not be read at all."""
    try:
        with Image.open(io.BytesIO(data)) as source:
            fmt = source.format
            if fmt not in _SAVE_OPTIONS:
                return data, source.width, source.height
            # Phones store the rotation as an EXIF flag; bake it in, since the
            # re-encode drops EXIF and the photo would otherwise lie sideways.
            image = ImageOps.exif_transpose(source)
            resized = max(image.size) > MAX_EDGE_PX
            image.thumbnail((MAX_EDGE_PX, MAX_EDGE_PX), Image.Resampling.LANCZOS)
            if fmt == "JPEG" and image.mode not in ("RGB", "L"):
                image = image.convert("RGB")
            out = io.BytesIO()
            options = dict(_SAVE_OPTIONS[fmt])
            icc = source.info.get("icc_profile")
            if icc and fmt in ("JPEG", "WEBP", "PNG"):
                options["icc_profile"] = icc
            image.save(out, format=fmt, **options)
            width, height = image.size
    except Exception as exc:  # noqa: BLE001 - a bad image is stored as-is, never fatal
        log.warning("image not optimised, storing original: %s", exc)
        return data, None, None

    optimised = out.getvalue()
    # Already within bounds and the re-encode saves little: keep the original.
    # Re-encoding a lossy image always costs some quality, and without this a
    # rerun would grind already-optimised files down a few bytes at a time.
    if not resized and len(optimised) > len(data) * 0.9:
        return data, width, height
    return optimised, width, height
