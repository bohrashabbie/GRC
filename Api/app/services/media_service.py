from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.middleware.error import BusinessRuleError, NotFoundError
from app.models.catalog import Media, Product, ProductMedia
from app.storage import storage

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif"}
_EXTENSIONS = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/avif": ".avif"}
MAX_UPLOAD_BYTES = 15 * 1024 * 1024


def storage_keys(db: Session, media_ids) -> dict[int, str]:
    """{media_id: storage_key} for a batch of ids, skipping None.

    Every record that points at media (a category's image, a banner's desktop
    artwork, a product's primary shot) needs this to render a preview. Returning
    only the id forces the client to either fire one request per row or show
    nothing — and showing nothing is what made a set image read as "No image
    set" on every edit form.
    """
    wanted = {media_id for media_id in media_ids if media_id is not None}
    if not wanted:
        return {}
    rows = db.query(Media.id, Media.storage_key).filter(Media.id.in_(wanted)).all()
    return {media_id: key for media_id, key in rows}


def upload_media(db: Session, file: UploadFile, uploaded_by_user_id: int) -> Media:
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise BusinessRuleError(
            f"Unsupported file type: {file.content_type}. Allowed: {', '.join(sorted(ALLOWED_MIME_TYPES))}"
        )
    data = file.file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise BusinessRuleError("File exceeds the 15MB upload limit.")

    checksum = hashlib.sha256(data).hexdigest()
    now = datetime.now(timezone.utc)
    key = storage.build_key(f"{now:%Y}/{now:%m}", f"{uuid4().hex}{_EXTENSIONS[file.content_type]}")
    storage.save_bytes(key, data)

    media = Media(
        storage_key=key,
        original_filename=file.filename,
        mime_type=file.content_type,
        bytes=len(data),
        checksum_sha256=checksum,
        derivatives={},
        # No worker/queue in this build (per environment constraints) to
        # generate resized derivatives, so uploads are "ready" immediately —
        # width_px/height_px are left null until image-dimension probing
        # (e.g. Pillow) is added.
        processing_status="ready",
        uploaded_by_user_id=uploaded_by_user_id,
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return media


def get_media(db: Session, media_id: int) -> Media:
    media = db.get(Media, media_id)
    if media is None:
        raise NotFoundError("Media not found")
    return media


def list_product_media(db: Session, product_id: int) -> list[dict]:
    """A product's gallery, primary image first then by sort_order, with each
    entry's underlying file inlined so the caller can render it directly."""
    if db.get(Product, product_id) is None:
        raise NotFoundError("Product not found")

    rows = (
        db.query(ProductMedia, Media)
        .join(Media, Media.id == ProductMedia.media_id)
        .filter(ProductMedia.product_id == product_id)
        .order_by(ProductMedia.is_primary.desc(), ProductMedia.sort_order, ProductMedia.id)
        .all()
    )
    return [
        {
            "id": link.id,
            "product_id": link.product_id,
            "media_id": link.media_id,
            "option_value_id": link.option_value_id,
            "sort_order": link.sort_order,
            "is_primary": link.is_primary,
            "media": media,
        }
        for link, media in rows
    ]


def attach_to_product(
    db: Session, media_id: int, product_id: int, option_value_id: int | None, sort_order: int, is_primary: bool
) -> ProductMedia:
    if db.get(Media, media_id) is None:
        raise NotFoundError("Media not found")
    link = ProductMedia(
        product_id=product_id,
        media_id=media_id,
        option_value_id=option_value_id,
        sort_order=sort_order,
        is_primary=is_primary,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link
