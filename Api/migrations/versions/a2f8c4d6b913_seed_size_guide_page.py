"""seed size guide page

The storefront PDP links every product to /pages/size-guide, but the fixed
page set seeded in d1a6e0b48f2c never included a size guide, so the link has
404'd since launch. Pages are not staff-creatable (no create endpoint), so
the only way to add one is a migration — same mechanism as the original seed.

The copy deliberately avoids a hard-coded size/measurement table: per-size
garment length and width live on option_values (e4b7d19c3a62) and are shown
on each product page, so the guide explains how to take and compare those
measurements instead of duplicating numbers that would drift from the
catalogue. Published immediately because the copy is real, not placeholder.

A footer menu item is added too, keeping the "one item per fixed page"
invariant from d1a6e0b48f2c.

Revision ID: a2f8c4d6b913
Revises: b9f3e6a2d571
Create Date: 2026-08-05 09:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a2f8c4d6b913"
down_revision: Union[str, None] = "b9f3e6a2d571"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PAGE_CODE = "size_guide"

BODY_EN = """\
<p>Every GR8 Trend thobe lists its exact garment measurements, so you can match a new thobe to one that already fits you well.</p>
<h2>How our sizes work</h2>
<p>On each product page, tap or hover over a size to see that garment's length and width in centimetres. These are measurements of the thobe itself laid flat, not body measurements.</p>
<ul>
<li><strong>Length</strong> — from the top of the shoulder, next to the collar, straight down to the hem.</li>
<li><strong>Width</strong> — straight across the chest from underarm to underarm, with the thobe laid flat.</li>
</ul>
<h2>How to find your size</h2>
<p>The most reliable way is to measure a thobe you already own and like the fit of:</p>
<ol>
<li>Lay it flat on a hard surface and smooth it out.</li>
<li>Measure the length from the highest point of the shoulder down to the hem.</li>
<li>Measure the width across the chest just below the armholes.</li>
<li>Compare both numbers with the measurements shown on the product page.</li>
</ol>
<h2>Fit tips</h2>
<ul>
<li>If you fall between two sizes, choose the larger one.</li>
<li>Allow for a variation of 1–2 cm, which is normal in garment production.</li>
<li>Not sure? Contact our customer service team with your measurements and we will help you choose.</li>
</ul>
"""

BODY_AR = """\
<p>كل ثوب من GR8 Trend تُعرض قياساته الفعلية بالسنتيمتر، لتتمكن من مطابقة الثوب الجديد مع ثوب يناسبك حاليًا.</p>
<h2>كيف تعمل مقاساتنا</h2>
<p>في صفحة كل منتج، اضغط على المقاس أو مرّر المؤشر فوقه لعرض طول الثوب وعرضه بالسنتيمتر. هذه قياسات الثوب نفسه وهو مفرود، وليست قياسات الجسم.</p>
<ul>
<li><strong>الطول</strong> — من أعلى الكتف بجانب الياقة نزولًا حتى نهاية الثوب.</li>
<li><strong>العرض</strong> — عرض الصدر من الإبط إلى الإبط والثوب مفرود.</li>
</ul>
<h2>كيف تختار مقاسك</h2>
<p>أدق طريقة هي قياس ثوب تملكه بالفعل ويعجبك مقاسه:</p>
<ol>
<li>افرد الثوب على سطح مستوٍ وسوِّه جيدًا.</li>
<li>قس الطول من أعلى نقطة في الكتف حتى نهاية الثوب.</li>
<li>قس العرض عبر الصدر أسفل فتحتي الأكمام مباشرة.</li>
<li>قارن الرقمين مع القياسات المعروضة في صفحة المنتج.</li>
</ol>
<h2>نصائح للمقاس</h2>
<ul>
<li>إذا كان قياسك بين مقاسين، اختر الأكبر.</li>
<li>ضع في الاعتبار فرقًا بسيطًا من 1–2 سم، وهو أمر طبيعي في إنتاج الملابس.</li>
<li>غير متأكد؟ تواصل مع خدمة العملاء وزوّدنا بقياساتك وسنساعدك في الاختيار.</li>
</ul>
"""

# (locale, title, slug, meta_description, body)
TRANSLATIONS = [
    (
        "en",
        "Size Guide",
        "size-guide",
        "How GR8 Trend thobe sizes work, how to measure a thobe you own, and how to pick the right size.",
        BODY_EN,
    ),
    (
        "ar",
        "دليل المقاسات",
        "دليل-المقاسات",
        "كيف تعمل مقاسات ثياب GR8 Trend، وكيف تقيس ثوبًا تملكه، وكيف تختار المقاس المناسب.",
        BODY_AR,
    ),
]


def upgrade() -> None:
    connection = op.get_bind()

    connection.execute(
        sa.text(
            """
            INSERT INTO pages (code, template, status, published_at, created_at, updated_at)
            VALUES (:code, 'default', 'published', now(), now(), now())
            ON CONFLICT (code) DO NOTHING
            """
        ),
        {"code": PAGE_CODE},
    )

    for locale, title, slug, meta_description, body in TRANSLATIONS:
        connection.execute(
            sa.text(
                """
                INSERT INTO page_translations
                    (page_id, locale, title, slug, body, meta_description,
                     created_at, updated_at)
                SELECT p.id, :locale, :title, :slug, :body, :meta_description,
                       now(), now()
                FROM pages p
                WHERE p.code = :code
                ON CONFLICT (page_id, locale) DO NOTHING
                """
            ),
            {
                "code": PAGE_CODE,
                "locale": locale,
                "title": title,
                "slug": slug,
                "body": body,
                "meta_description": meta_description,
            },
        )

    connection.execute(
        sa.text(
            """
            INSERT INTO menu_items
                (menu_id, link_type, link_target_id, sort_order, is_active,
                 created_at, updated_at)
            SELECT m.id, 'page', p.id,
                   (SELECT COALESCE(MAX(mi.sort_order), -1) + 1
                    FROM menu_items mi WHERE mi.menu_id = m.id),
                   TRUE, now(), now()
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
        {"code": PAGE_CODE},
    )

    for locale, title, _slug, _meta, _body in TRANSLATIONS:
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
            {"code": PAGE_CODE, "locale": locale, "label": title},
        )


def downgrade() -> None:
    connection = op.get_bind()
    # menu_items.link_target_id has no FK cascade from pages, so remove the
    # footer entry explicitly before the page (page_translations cascade).
    connection.execute(
        sa.text(
            """
            DELETE FROM menu_items mi
            USING menus m, pages p
            WHERE mi.menu_id = m.id AND m.code = 'footer'
              AND mi.link_type = 'page' AND mi.link_target_id = p.id
              AND p.code = :code
            """
        ),
        {"code": PAGE_CODE},
    )
    connection.execute(
        sa.text("DELETE FROM pages WHERE code = :code"),
        {"code": PAGE_CODE},
    )
