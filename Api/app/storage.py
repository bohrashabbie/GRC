"""Disk-backed storage for uploaded media.

Swap the module-level `storage` instance for an R2/S3-backed implementation
later (same save_bytes/build_key/url_for surface) — that's the only file
that needs to change.
"""

from __future__ import annotations

from pathlib import Path

from app.config import settings


class LocalStorage:
    def __init__(self, base_dir: str) -> None:
        self.base_dir = Path(base_dir)

    def build_key(self, subdir: str, filename: str) -> str:
        return f"{subdir}/{filename}"

    def save_bytes(self, key: str, data: bytes) -> None:
        path = self.base_dir / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def url_for(self, key: str) -> str:
        return f"/uploads/{key}"


storage = LocalStorage(settings.upload_dir)
