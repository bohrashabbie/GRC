from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.models.auth import User
from app.models.catalog import Variant
from app.schemas.catalog import GenerateVariantsRequest, VariantOut, VariantPriceUpdate, VariantUpdate
from app.services import variant_service

router = APIRouter()


@router.get("/products/{product_id}/variants", response_model=list[VariantOut])
def list_variants(
    product_id: int, db: Session = Depends(get_db), _user=Depends(require("catalog.view"))
) -> list[Variant]:
    return variant_service.list_variants(db, product_id)


@router.post("/products/{product_id}/variants/generate", response_model=list[VariantOut])
def generate_variants(
    product_id: int,
    payload: GenerateVariantsRequest,
    db: Session = Depends(get_db),
    _user=Depends(require("catalog.manage")),
) -> list[Variant]:
    """Creates exactly the ticked combinations in the request body — never a
    full cartesian product. Rejects with 422 (code=variant_limit_exceeded) if
    the product would exceed 300 variants."""
    return variant_service.generate_variants(db, product_id, payload.combinations)


@router.get("/variants/{variant_id}", response_model=VariantOut)
def get_variant(variant_id: int, db: Session = Depends(get_db), _user=Depends(require("catalog.view"))) -> Variant:
    return variant_service.get_variant(db, variant_id)


@router.patch("/variants/{variant_id}", response_model=VariantOut)
def update_variant(
    variant_id: int, payload: VariantUpdate, db: Session = Depends(get_db), _user=Depends(require("catalog.manage"))
) -> Variant:
    return variant_service.update_variant(db, variant_id, payload)


@router.patch("/variants/{variant_id}/price", response_model=VariantOut)
def update_variant_price(
    variant_id: int,
    payload: VariantPriceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require("variant.price_edit")),
) -> Variant:
    return variant_service.update_variant_price(db, variant_id, payload, current_user.id)


@router.delete("/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def deactivate_variant(
    variant_id: int, db: Session = Depends(get_db), _user=Depends(require("catalog.manage"))
) -> None:
    variant_service.deactivate_variant(db, variant_id)


# Permission keys used by this router: catalog.view, catalog.manage, variant.price_edit
