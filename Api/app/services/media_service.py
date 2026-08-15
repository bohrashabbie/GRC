from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.middleware.error import BusinessRuleError, NotFoundError, ValidationAppError
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


def _get_product_media(db: Session, product_id: int, product_media_id: int) -> ProductMedia:
    link = db.get(ProductMedia, product_media_id)
    if link is None or link.product_id != product_id:
        raise NotFoundError("Product image not found")
    return link


def detach_from_product(db: Session, product_id: int, product_media_id: int) -> None:
    """Remove one image from a product's gallery.

    Only the link goes — the uploaded file stays in `media`, because the same
    upload can be attached to more than one product and nothing here can know
    it is unused elsewhere.

    Dropping the primary would leave the gallery with no lead image and the
    storefront falling back to nothing, so the next image by sort order is
    promoted in the same transaction.
    """
    link = _get_product_media(db, product_id, product_media_id)
    was_primary = link.is_primary
    db.delete(link)
    db.flush()
    if was_primary:
        successor = db.execute(
            select(ProductMedia)
            .where(ProductMedia.product_id == product_id)
            .order_by(ProductMedia.sort_order, ProductMedia.id)
            .limit(1)
        ).scalar_one_or_none()
        if successor is not None:
            successor.is_primary = True
    db.commit()


def set_primary_product_media(db: Session, product_id: int, product_media_id: int) -> None:
    """Exactly one image leads the gallery, so promoting one demotes the rest."""
    link = _get_product_media(db, product_id, product_media_id)
    db.execute(
        update(ProductMedia)
        .where(ProductMedia.product_id == product_id, ProductMedia.id != link.id)
        .values(is_primary=False)
    )
    link.is_primary = True
    db.commit()


def reorder_product_media(db: Session, product_id: int, ordered_ids: list[int]) -> None:
    """Rewrite sort_order to match the order the ids arrive in.

    The whole gallery must be listed. A partial list would renumber some rows
    against stale positions and leave the order half-applied, which is harder to
    notice than an outright rejection.
    """
    existing = {
        link.id
        for link in db.execute(
            select(ProductMedia).where(ProductMedia.product_id == product_id)
        ).scalars()
    }
    submitted = set(ordered_ids)
    if submitted != existing:
        raise ValidationAppError(
            "The image order must list every image on the product, exactly once.",
            code="incomplete_media_order",
            details={"expected": sorted(existing), "received": ordered_ids},
        )
    for position, link_id in enumerate(ordered_ids):
        db.execute(
            update(ProductMedia).where(ProductMedia.id == link_id).values(sort_order=position)
        )
    db.commit()
