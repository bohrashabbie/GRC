"""Shrink images that were uploaded before uploads were resized on the way in.

    python -m app.optimise_uploads            # rewrite oversized files
    python -m app.optimise_uploads --dry-run  # report only

Each file is rewritten in place under the same name and format (so every
stored URL keeps working), through the same app.images.optimise new uploads
use, and its media row gets the new size, checksum and dimensions. Files that
are already small and within bounds are left untouched. Safe to rerun.
"""

from __future__ import annotations

import hashlib
import os
import sys
from pathlib import Path

from app.config import settings
from app.database import SessionLocal
from app.images import optimise
from app.models.catalog import Media


def main(dry_run: bool) -> None:
    base = Path(settings.upload_dir)
    before_total = after_total = changed = 0
    with SessionLocal() as db:
        for media in db.query(Media).order_by(Media.id).all():
            path = base / media.storage_key
            if not path.is_file():
                print(f"missing  #{media.id} {media.storage_key}")
                continue
            data = path.read_bytes()
            new, width, height = optimise(data)
            before_total += len(data)
            after_total += len(new)
            if width and height and (media.width_px, media.height_px) != (width, height):
                media.width_px, media.height_px = width, height
            if new is data:
                continue
            changed += 1
            print(f"#{media.id} {media.storage_key}: {len(data) // 1024} KB -> {len(new) // 1024} KB")
            if dry_run:
                continue
            tmp = path.with_suffix(path.suffix + ".tmp")
            tmp.write_bytes(new)
            os.replace(tmp, path)
            media.bytes = len(new)
            media.checksum_sha256 = hashlib.sha256(new).hexdigest()
        if dry_run:
            db.rollback()
        else:
            db.commit()
    print(
        f"{'would shrink' if dry_run else 'shrank'} {changed} files: "
        f"{before_total / 1048576:.1f} MB -> {after_total / 1048576:.1f} MB"
    )


if __name__ == "__main__":
    main(dry_run="--dry-run" in sys.argv)
