"""seed fixed pages and footer menu

Pages and menus stop being staff-creatable (see routers/pages.py and
routers/menus.py -- the create/delete endpoints for both were removed in the
same change). Without a create endpoint the fixed set of pages a storefront
needs has to already exist, so this migration seeds them once: staff can only
edit their translation text (title/slug/body/meta) and toggle publish status,
never add or remove a page.

The footer menu is seeded the same way, with one item per fixed page, so
staff can relabel a nav entry but not add/remove links.

Revision ID: d1a6e0b48f2c
Revises: 9b2f6a4d1c73
Create Date: 2026-07-29 09:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d1a6e0b48f2c"
down_revision: Union[str, None] = "9b2f6a4d1c73"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (code, template, en title, en slug, en body, ar title, ar slug, ar body)
PAGES = [
    (
        "about_us", "default",
        "About Us", "about-us", "Add your About Us content here.",
        "من نحن", "من-نحن", "أضف محتوى صفحة من نحن هنا.",
    ),
    (
        "contact_us", "contact",
        "Contact Us", "contact-us", "Add your Contact Us content here.",
        "اتصل بنا", "اتصل-بنا", "أضف محتوى صفحة اتصل بنا هنا.",
    ),
    (
        "privacy_policy", "default",
        "Privacy Policy", "privacy-policy", "Add your Privacy Policy content here.",
        "سياسة الخصوصية", "سياسة-الخصوصية", "أضف محتوى سياسة الخصوصية هنا.",
    ),
    (
        "terms_conditions", "default",
        "Terms & Conditions", "terms-conditions", "Add your Terms & Conditions content here.",
        "الشروط والأحكام", "الشروط-والأحكام", "أضف محتوى الشروط والأحكام هنا.",
    ),
    (
        "shipping_returns", "default",
        "Shipping & Returns", "shipping-returns", "Add your Shipping & Returns content here.",
        "الشحن والإرجاع", "الشحن-والإرجاع", "أضف محتوى الشحن والإرجاع هنا.",
    ),
    (
        "faq", "default",
        "FAQ", "faq", "Add your FAQ content here.",
        "الأسئلة الشائعة", "الأسئلة-الشائعة", "أضف محتوى الأسئلة الشائعة هنا.",
    ),
]


def upgrade() -> None:
    connection = op.get_bind()

    for code, template, en_title, en_slug, en_body, ar_title, ar_slug, ar_body in PAGES:
        connection.execute(
            sa.text(
                """
                INSERT INTO pages (code, template, status, created_at, updated_at)
                VALUES (:code, :template, 'draft', now(), now())
                ON CONFLICT (code) DO NOTHING
                """
            ),
            {"code": code, "template": template},
        )

        for locale, title, slug, body in (
            ("en", en_title, en_slug, en_body),
            ("ar", ar_title, ar_slug, ar_body),
        ):
            connection.execute(
                sa.text(
                    """
                    INSERT INTO page_translations
                        (page_id, locale, title, slug, body, created_at, updated_at)
                    SELECT p.id, :locale, :title, :slug, :body, now(), now()
                    FROM pages p
                    WHERE p.code = :code
                    ON CONFLICT (page_id, locale) DO NOTHING
                    """
                ),
                {"code": code, "locale": locale, "title": title, "slug": slug, "body": body},
            )

    connection.execute(
        sa.text(
            """
            INSERT INTO menus (code, is_active, created_at, updated_at)
            VALUES ('footer', TRUE, now(), now())
            ON CONFLICT (code) DO NOTHING
            """
        )
    )

    for sort_order, (code, *_rest) in enumerate(PAGES):
        connection.execute(
            sa.text(
                """
                INSERT INTO menu_items
                    (menu_id, link_type, link_target_id, sort_order, is_active,
                     created_at, updated_at)
                SELECT m.id, 'page', p.id, :sort_order, TRUE, now(), now()
                FROM menus m, pages p
                WHERE m.code = 'footer' AND p.code = :code
                  AND NOT EXISTS (
                      SELECT 1 FROM menu_items mi
                      WHERE mi.menu_id = m.id
                        AND mi.link_type = 'page'
                        AND mi.link_target_id = p.id
                  )
                """
            ),
            {"code": code, "sort_order": sort_order},
        )

    # Labels default to each page's own title per locale.
    for code, _template, en_title, _en_slug, _en_body, ar_title, _ar_slug, _ar_body in PAGES:
        for locale, label in (("en", en_title), ("ar", ar_title)):
            connection.execute(
                sa.text(
                    """
                    INSERT INTO menu_item_translations (menu_item_id, locale, label, created_at, updated_at)
                    SELECT mi.id, :locale, :label, now(), now()
                    FROM menu_items mi
                    JOIN menus m ON m.id = mi.menu_id
                    JOIN pages p ON p.id = mi.link_target_id
                    WHERE m.code = 'footer' AND mi.link_type = 'page' AND p.code = :code
                    ON CONFLICT (menu_item_id, locale) DO NOTHING
                    """
                ),
                {"code": code, "locale": locale, "label": label},
            )


def downgrade() -> None:
    connection = op.get_bind()
    connection.execute(sa.text("DELETE FROM menus WHERE code = 'footer'"))
    connection.execute(
        sa.text("DELETE FROM pages WHERE code = ANY(:codes)"),
        {"codes": [code for code, *_rest in PAGES]},
    )
