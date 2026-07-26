"""Load a starter thobe catalogue through the public admin API.

Run inside the api container:

    python -m app.import_catalog

It authenticates as the owner from OWNER_EMAIL/OWNER_PASSWORD, then creates
categories and products over HTTP rather than touching the database directly,
so every permission check, validation rule and audit entry behaves exactly as
it would if a person had typed it into the admin.

Re-running is safe: anything whose code or slug already exists is skipped.

The copy here is written for this store. Product photography is deliberately
not handled — attach media in the admin, or the storefront will show cards
without images.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

BASE_URL = os.getenv("IMPORT_API_BASE", "http://127.0.0.1:8000/api/v1")
OWNER_EMAIL = os.getenv("OWNER_EMAIL", "owner@alshiaka.sa").strip().lower()
OWNER_PASSWORD = os.getenv("OWNER_PASSWORD", "")


# --------------------------------------------------------------------------- #
# Catalogue                                                                    #
# --------------------------------------------------------------------------- #

CATEGORIES = [
    ("thobes-saudi", "الثوب السعودي", "Saudi Thobes",
     "القَصّة السعودية الكلاسيكية بياقة قائمة وأكمام مزرّرة.",
     "The classic Saudi cut, band collar and buttoned cuffs."),
    ("thobes-emirati", "الثوب الإماراتي", "Emirati Thobes",
     "كندورة بقصّة أوسع وبدون ياقة، مع كرتة مطرزة.",
     "A looser, collarless kandura finished with an embroidered tassel."),
    ("thobes-summer", "ثياب الصيف", "Summer Thobes",
     "أقمشة خفيفة تتنفّس في حرّ الصيف الطويل.",
     "Light cloth that breathes through a long Gulf summer."),
    ("thobes-winter", "ثياب الشتاء", "Winter Thobes",
     "أوزان أثقل ومزيج صوفي يحفظ شكله في البرد.",
     "Heavier weights and wool blends that hold their line in the cold."),
    ("thobes-formal", "ثياب المناسبات", "Formal Thobes",
     "قصّات مضبوطة وتفاصيل هادئة لمجالس المناسبات.",
     "Precise cuts and quiet detailing for occasions."),
    ("thobes-daily", "ثياب يومية", "Everyday Thobes",
     "ثياب سهلة العناية تتحمّل الاستعمال اليومي.",
     "Easy-care thobes built for daily wear."),
]

# (category_code, price, featured, best_seller, ar_name, en_name, ar_short,
#  en_short, ar_body, en_body)
PRODUCTS = [
    ("thobes-saudi", "349.00", True, True,
     "ثوب سعودي كلاسيكي — عاجي", "Classic Saudi Thobe — Ivory",
     "قطن مصري ممشّط بياقة قائمة.", "Combed Egyptian cotton with a band collar.",
     "ثوب بقصّة سعودية كلاسيكية من قطن مصري ممشّط، بياقة قائمة وأكمام مزرّرة. "
     "الوزن متوسط يناسب أغلب أيام السنة، والخياطة مزدوجة عند الأكتاف لتحفظ "
     "استقامة الكتف بعد الغسيل. يُغسل آليًا على حرارة ٣٠ ويُكوى على حرارة متوسطة.",
     "A classic Saudi cut in combed Egyptian cotton, with a band collar and "
     "buttoned cuffs. The mid-weight cloth suits most of the year, and the "
     "shoulders are double-stitched so the line holds after washing. Machine "
     "wash at 30, warm iron."),

    ("thobes-saudi", "395.00", False, True,
     "ثوب سعودي — ياقة فرنسية", "Saudi Thobe — French Collar",
     "ياقة فرنسية وأزرار صدفية.", "French collar with shell buttons.",
     "قصّة سعودية بياقة فرنسية وأزرار صدفية، من بوبلين قطني بنسيج متين. "
     "التفصيل أضيق قليلًا عند الخصر، والجيب الداخلي مبطّن. مناسب للعمل "
     "والمناسبات النهارية.",
     "A Saudi cut with a French collar and shell buttons, in a firm cotton "
     "poplin. Slightly closer through the waist, with a lined inner pocket. "
     "Made for work and daytime occasions."),

    ("thobes-emirati", "379.00", False, True,
     "كندورة إماراتية", "Emirati Kandura",
     "قصّة واسعة بدون ياقة مع كرتة.", "Loose collarless cut with a tassel.",
     "كندورة بالقصّة الإماراتية الواسعة، بدون ياقة ومع كرتة مطرزة عند الصدر. "
     "القماش خفيف ينساب مع الحركة، والأكمام واسعة عند المعصم. الطول قياسي "
     "ويمكن تعديله عند الطلب.",
     "The wide Emirati cut, collarless, finished with an embroidered tassel at "
     "the chest. The cloth is light and moves with the wearer, with generous "
     "sleeves at the wrist. Standard length, alterable on request."),

    ("thobes-emirati", "455.00", True, False,
     "كندورة مطرزة — عاجي", "Embroidered Kandura — Ivory",
     "تطريز يدوي هادئ عند الصدر.", "Restrained hand embroidery at the chest.",
     "كندورة عاجية بتطريز يدوي هادئ حول فتحة الصدر، من قطن مخلوط بالحرير يمنح "
     "لمعة خفيفة دون مبالغة. مخصصة للمناسبات المسائية.",
     "An ivory kandura with restrained hand embroidery around the chest "
     "opening, in a cotton-silk blend that catches light without shine. Made "
     "for evening occasions."),

    ("thobes-summer", "289.00", False, True,
     "ثوب صيفي — مزيج كتان", "Summer Thobe — Linen Blend",
     "كتان وقطن يتنفّس في الحر.", "A linen-cotton weave that breathes.",
     "مزيج كتان وقطن بنسبة تحفظ التهوية دون أن يتجعّد بسرعة. القصّة أوسع قليلًا "
     "عند الجذع لتسمح بمرور الهواء، واللون فاتح يعكس الحرارة. الخيار الأول "
     "لأشهر الصيف الطويلة.",
     "A linen-cotton blend balanced to stay airy without creasing at a touch. "
     "Cut a little fuller through the body so air moves, in a pale shade that "
     "turns away heat. The first choice for the long summer months."),

    ("thobes-summer", "265.00", False, False,
     "ثوب صيفي خفيف — أبيض", "Lightweight Summer Thobe — White",
     "بوبلين خفيف سريع الجفاف.", "Light poplin that dries quickly.",
     "بوبلين قطني خفيف الوزن سريع الجفاف، بياقة قائمة منخفضة تريح الرقبة في "
     "الحر. مناسب للسفر لأنه يستعيد شكله بعد الطي.",
     "A light, quick-drying cotton poplin with a low band collar that sits "
     "easily on the neck in heat. Good for travel — it recovers its shape "
     "after folding."),

    ("thobes-winter", "399.00", False, True,
     "ثوب شتوي — لمسة صوف", "Winter Thobe — Wool Touch",
     "مزيج صوفي يحفظ شكله.", "A wool blend that keeps its shape.",
     "مزيج صوفي بوزن أثقل يمنح الثوب وقارًا في الحركة ويحفظ استقامته في البرد. "
     "مبطّن جزئيًا عند الكتف، والياقة أقوى قليلًا لتبقى قائمة. يُنظّف جافًا.",
     "A heavier wool blend that gives the thobe weight in movement and holds "
     "its line in the cold. Partially lined at the shoulder, with a firmer "
     "collar that stays upright. Dry clean."),

    ("thobes-winter", "520.00", True, False,
     "ثوب شتوي فاخر — فحمي", "Premium Winter Thobe — Charcoal",
     "صوف ثقيل بلون فحمي عميق.", "Heavy wool in a deep charcoal.",
     "ثوب شتوي بلون فحمي عميق من صوف ثقيل، بخياطة مقوّاة عند الأكمام والجيوب. "
     "اللون الداكن يناسب المساء، والوزن يجعله مريحًا في أبرد الليالي.",
     "A deep charcoal winter thobe in heavy wool, reinforced at the sleeves "
     "and pockets. The dark shade suits evening, and the weight carries the "
     "coldest nights comfortably."),

    ("thobes-formal", "425.00", True, False,
     "ثوب مناسبات — قصّة مضبوطة", "Formal Thobe — Tailored Cut",
     "قصّة مضبوطة وتفاصيل هادئة.", "A precise cut with quiet detailing.",
     "قصّة مضبوطة عند الكتف والخصر بتفاصيل هادئة لا تلفت النظر: أزرار مغطاة، "
     "حاشية مخفية، وخياطة داخلية نظيفة. مخصص للمجالس والمناسبات الرسمية.",
     "Precise through the shoulder and waist, with detailing that stays quiet: "
     "covered buttons, a concealed hem, clean internal seams. Made for majlis "
     "and formal occasions."),

    ("thobes-formal", "610.00", False, False,
     "ثوب مناسبات — قطن حريري", "Formal Thobe — Cotton Silk",
     "قطن حريري بلمعة خفيفة.", "Cotton silk with a soft lustre.",
     "قطن مخلوط بالحرير يمنح لمعة خفيفة تحت الإضاءة المسائية دون أن يبدو لامعًا. "
     "القصّة مستقيمة والطول أطول قليلًا من المعتاد.",
     "A cotton-silk blend with a soft lustre under evening light, stopping "
     "short of shine. Straight cut, and a touch longer than standard."),

    ("thobes-daily", "179.00", False, False,
     "ثوب يومي — سهل العناية", "Everyday Thobe — Easy Care",
     "لا يحتاج كيًا بعد كل غسلة.", "Rarely needs an iron.",
     "ثوب يومي من قماش معالج يقاوم التجعّد، لا يحتاج كيًا بعد كل غسلة. "
     "الخياطة مقوّاة عند نقاط الشد، والسعر يجعله مناسبًا لاقتناء أكثر من قطعة.",
     "An everyday thobe in a treated cloth that resists creasing and rarely "
     "needs an iron. Reinforced at the stress points, and priced to own more "
     "than one."),

    ("thobes-daily", "199.00", False, False,
     "ثوب يومي — قطن مضغوط", "Everyday Thobe — Compact Cotton",
     "قطن مضغوط متين للاستعمال المتكرر.", "Compact cotton for heavy rotation.",
     "قطن مضغوط النسيج يتحمّل الغسيل المتكرر دون أن يفقد لونه. القصّة قياسية "
     "والجيوب أعمق قليلًا من المعتاد.",
     "A compact cotton weave that takes repeated washing without losing "
     "colour. Standard cut, with pockets a little deeper than usual."),
]


# --------------------------------------------------------------------------- #
# HTTP                                                                         #
# --------------------------------------------------------------------------- #


def _request(method: str, path: str, token: str | None = None, payload: dict | None = None):
    url = f"{BASE_URL}{path}"
    data = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(url, data=data, method=method)
    request.add_header("Content-Type", "application/json")
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read()
            return json.loads(body) if body else None
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")
        raise RuntimeError(f"{method} {path} -> {error.code}: {detail}") from error


def login() -> str:
    if not OWNER_PASSWORD:
        raise SystemExit("OWNER_PASSWORD is not set in this container's environment.")
    tokens = _request("POST", "/auth/login", payload={"email": OWNER_EMAIL, "password": OWNER_PASSWORD})
    return tokens["access_token"]


# --------------------------------------------------------------------------- #
# Import                                                                       #
# --------------------------------------------------------------------------- #


def import_categories(token: str) -> dict[str, int]:
    existing = {
        row["code"]: row["id"]
        for row in _request("GET", "/categories?limit=200", token)["items"]
    }
    ids: dict[str, int] = {}

    for index, (code, ar_name, en_name, ar_desc, en_desc) in enumerate(CATEGORIES):
        if code in existing:
            ids[code] = existing[code]
            print(f"  category {code}: exists")
            continue
        created = _request("POST", "/categories", token, {
            "dimension": "category",
            "code": code,
            "sort_order": index,
            "show_in_menu": True,
            "is_active": True,
            "translations": [
                {"locale": "ar", "name": ar_name, "description": ar_desc},
                {"locale": "en", "name": en_name, "description": en_desc},
            ],
        })
        ids[code] = created["id"]
        print(f"  category {code}: created")
    return ids


def import_products(token: str, category_ids: dict[str, int]) -> None:
    existing_names = set()
    for row in _request("GET", "/products?limit=200", token)["items"]:
        for translation in row.get("translations", []):
            existing_names.add(translation.get("name"))

    for entry in PRODUCTS:
        (category_code, price, featured, best_seller,
         ar_name, en_name, ar_short, en_short, ar_body, en_body) = entry

        if en_name in existing_names:
            print(f"  product {en_name}: exists")
            continue

        created = _request("POST", "/products", token, {
            "product_type": "simple",
            "base_price": price,
            "tax_class": "standard",
            "is_featured": featured,
            "is_best_seller": best_seller,
            "category_ids": [category_ids[category_code]],
            "translations": [
                {"locale": "ar", "name": ar_name, "short_description": ar_short, "description": ar_body},
                {"locale": "en", "name": en_name, "short_description": en_short, "description": en_body},
            ],
        })

        # Products are created as drafts; the storefront only reads active ones.
        _request("PATCH", f"/products/{created['id']}/status", token, {"status": "active"})
        print(f"  product {en_name}: created and published")


def main() -> None:
    print(f"Importing into {BASE_URL} as {OWNER_EMAIL}")
    token = login()
    print("Categories:")
    category_ids = import_categories(token)
    print("Products:")
    import_products(token, category_ids)
    print(
        "\nDone. Products have no images yet — attach media per product in the "
        "admin, otherwise storefront cards render without a photo."
    )


if __name__ == "__main__":
    main()
