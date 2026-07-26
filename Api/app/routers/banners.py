from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.cms import Banner
from app.schemas.cms import BannerCreate, BannerRead, BannerUpdate
from app.services import cms_service

router = APIRouter()


@router.post("", response_model=BannerRead, status_code=status.HTTP_201_CREATED)
def create_banner(
    payload: BannerCreate,
    db: Session = Depends(get_db),
    _user=Depends(require("cms.banner.manage")),
) -> Banner:
    return cms_service.create_banner(db, payload)


@router.get("")
def list_banners(
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    placement: str | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require("cms.view")),
) -> dict:
    items, next_cursor = cms_service.list_banners(db, cursor, limit, placement, is_active)
    return {
        "items": [BannerRead.model_validate(item).model_dump() for item in items],
        "next_cursor": next_cursor,
    }


@router.get("/{banner_id}", response_model=BannerRead)
def get_banner(
    banner_id: int, db: Session = Depends(get_db), _user=Depends(require("cms.view"))
) -> Banner:
    return cms_service.get_banner(db, banner_id)


@router.patch("/{banner_id}", response_model=BannerRead)
def update_banner(
    banner_id: int,
    payload: BannerUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require("cms.banner.manage")),
) -> Banner:
    return cms_service.update_banner(db, banner_id, payload)


@router.delete("/{banner_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_banner(
    banner_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require("cms.banner.manage")),
) -> Response:
    """Soft delete — flips is_active, the row stays."""
    cms_service.deactivate_banner(db, banner_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
