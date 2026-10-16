"""Shrink images that were uploaded before uploads were resized on the way in.

    python -m app.optimise_uploads            # rewrite oversized files
    python -m app.optimise_uploads --dry-run  # report only

Each file is rewritten in place under the same name and format (so every
stored URL keeps working), through the same app.images.optimise new uploads
use, and its media row gets the new size, checksum and dimensions. Files that
are already small and within bounds are left untouched.

It also writes the WebP renditions (media.derivatives) for any image that does
not have all of them yet — new uploads get them on the way in, this covers the
ones from before. Safe to rerun.
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
from app.services.media_service import store_derivatives


def main(dry_run: bool) -> None:
    base = Path(settings.upload_dir)
    before_total = after_total = changed = rendered = 0
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
            if new is not data:
                changed += 1
                print(f"#{media.id} {media.storage_key}: {len(data) // 1024} KB -> {len(new) // 1024} KB")
                if not dry_run:
                    tmp = path.with_suffix(path.suffix + ".tmp")
                    tmp.write_bytes(new)
                    os.replace(tmp, path)
                    media.bytes = len(new)
                    media.checksum_sha256 = hashlib.sha256(new).hexdigest()
                    media.derivatives = {}  # made from the old bytes; redo below

            derivatives = media.derivatives or {}
            if not derivatives or not all((base / key).is_file() for key in derivatives.values()):
                rendered += 1
                print(f"#{media.id} {media.storage_key}: renditions")
                if not dry_run:
                    media.derivatives = store_derivatives(media.storage_key, new)
        if dry_run:
            db.rollback()
        else:
            db.commit()
    print(
        f"{'would shrink' if dry_run else 'shrank'} {changed} files: "
        f"{before_total / 1048576:.1f} MB -> {after_total / 1048576:.1f} MB; "
        f"{'would render' if dry_run else 'rendered'} WebP sizes for {rendered} images"
    )


if __name__ == "__main__":
    main(dry_run="--dry-run" in sys.argv)
