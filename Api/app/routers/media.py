from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.auth import User
from app.models.catalog import Media, ProductMedia
from app.schemas.catalog import MediaOut, ProductMediaAttach, ProductMediaOut
from app.services import media_service

router = APIRouter()


@router.post("/upload", response_model=MediaOut, status_code=status.HTTP_201_CREATED)
def upload_media(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require("media.upload")),
) -> Media:
    return media_service.upload_media(db, file, current_user.id)


@router.get("/{media_id}", response_model=MediaOut)
def get_media(media_id: int, db: Session = Depends(get_db), _user=Depends(require("catalog.view"))) -> Media:
    return media_service.get_media(db, media_id)


@router.post("/{media_id}/attach", response_model=ProductMediaOut, status_code=status.HTTP_201_CREATED)
def attach_media_to_product(
    media_id: int,
    payload: ProductMediaAttach,
    db: Session = Depends(get_db),
    _user=Depends(require("catalog.manage")),
) -> ProductMedia:
    """Attaches an uploaded media file to a product's gallery, optionally
    tagged to one option_value_id so all sizes of that colour share it."""
    return media_service.attach_to_product(
        db, media_id, payload.product_id, payload.option_value_id, payload.sort_order, payload.is_primary
    )


# Permission keys used by this router: media.upload, catalog.view, catalog.manage
