from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.cms import Page
from app.schemas.cms import PageCreate, PageRead, PageUpdate
from app.services import cms_service

router = APIRouter()


@router.post("", response_model=PageRead, status_code=status.HTTP_201_CREATED)
def create_page(
    payload: PageCreate,
    db: Session = Depends(get_db),
    _user=Depends(require("cms.page.manage")),
) -> Page:
    return cms_service.create_page(db, payload)


@router.get("")
def list_pages(
    cursor: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _user=Depends(require("cms.view")),
) -> dict:
    items, next_cursor = cms_service.list_pages(db, cursor, limit, status_filter)
    return {
        "items": [PageRead.model_validate(item).model_dump() for item in items],
        "next_cursor": next_cursor,
    }


@router.get("/{page_id}", response_model=PageRead)
def get_page(
    page_id: int, db: Session = Depends(get_db), _user=Depends(require("cms.view"))
) -> Page:
    return cms_service.get_page(db, page_id)


@router.patch("/{page_id}", response_model=PageRead)
def update_page(
    page_id: int,
    payload: PageUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require("cms.page.manage")),
) -> Page:
    """Changing `status` here needs cms.page.manage; the dedicated publish
    toggle below is what cms.page.publish gates."""
    return cms_service.update_page(db, page_id, payload)


@router.delete("/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_page(
    page_id: int, db: Session = Depends(get_db), _user=Depends(require("cms.page.publish"))
) -> Response:
    """Soft delete — the page returns to draft and leaves the storefront."""
    cms_service.unpublish_page(db, page_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
