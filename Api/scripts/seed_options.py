"""Seed comprehensive Color and Size options and option values in the CMS catalog.

Run with:
    python -m scripts.seed_options
or from Api folder:
    python scripts/seed_options.py
"""

from __future__ import annotations

import sys
import os
import io

# Ensure UTF-8 output encoding on Windows
if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Add parent directory to path so app can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.catalog import Option, OptionTranslation, OptionValue, OptionValueTranslation

# --------------------------------------------------------------------------- #
# Options & Option Values Definitions                                         #
# --------------------------------------------------------------------------- #

OPTIONS_DATA = [
    {
        "code": "colour",
        "input_type": "swatch",
        "is_filterable": True,
        "sort_order": 1,
        "translations": [
            {"locale": "ar", "label": "اللون"},
            {"locale": "en", "label": "Color"},
        ],
        "values": [
            {"code": "white", "hex_color": "#FFFFFF", "sort_order": 1, "translations": [{"locale": "ar", "label": "أبيض"}, {"locale": "en", "label": "White"}]},
            {"code": "off-white", "hex_color": "#F3EFE7", "sort_order": 2, "translations": [{"locale": "ar", "label": "أبيض مكسور"}, {"locale": "en", "label": "Off-White"}]},
            {"code": "ivory", "hex_color": "#FFFFF0", "sort_order": 3, "translations": [{"locale": "ar", "label": "عاجي"}, {"locale": "en", "label": "Ivory"}]},
            {"code": "cream", "hex_color": "#EFE3CC", "sort_order": 4, "translations": [{"locale": "ar", "label": "كريمي"}, {"locale": "en", "label": "Cream"}]},
            {"code": "beige", "hex_color": "#D9C7A7", "sort_order": 5, "translations": [{"locale": "ar", "label": "بيج"}, {"locale": "en", "label": "Beige"}]},
            {"code": "camel", "hex_color": "#C19A6B", "sort_order": 6, "translations": [{"locale": "ar", "label": "جملي"}, {"locale": "en", "label": "Camel"}]},
            {"code": "light-blue", "hex_color": "#ADD8E6", "sort_order": 7, "translations": [{"locale": "ar", "label": "أزرق فاتح"}, {"locale": "en", "label": "Light Blue"}]},
            {"code": "blue", "hex_color": "#2C3E63", "sort_order": 8, "translations": [{"locale": "ar", "label": "أزرق"}, {"locale": "en", "label": "Blue"}]},
            {"code": "navy", "hex_color": "#1B263B", "sort_order": 9, "translations": [{"locale": "ar", "label": "كحلي"}, {"locale": "en", "label": "Navy"}]},
            {"code": "grey", "hex_color": "#8A8D8F", "sort_order": 10, "translations": [{"locale": "ar", "label": "رمادي"}, {"locale": "en", "label": "Grey"}]},
            {"code": "charcoal", "hex_color": "#36454F", "sort_order": 11, "translations": [{"locale": "ar", "label": "فحمي"}, {"locale": "en", "label": "Charcoal"}]},
            {"code": "black", "hex_color": "#1A1A1A", "sort_order": 12, "translations": [{"locale": "ar", "label": "أسود"}, {"locale": "en", "label": "Black"}]},
            {"code": "brown", "hex_color": "#6B4A32", "sort_order": 13, "translations": [{"locale": "ar", "label": "بني"}, {"locale": "en", "label": "Brown"}]},
            {"code": "olive", "hex_color": "#556B2F", "sort_order": 14, "translations": [{"locale": "ar", "label": "زيتوني"}, {"locale": "en", "label": "Olive"}]},
        ],
    },
    {
        "code": "color",
        "input_type": "swatch",
        "is_filterable": True,
        "sort_order": 2,
        "translations": [
            {"locale": "ar", "label": "اللون"},
            {"locale": "en", "label": "Color"},
        ],
        "values": [
            {"code": "color-white", "hex_color": "#FFFFFF", "sort_order": 1, "translations": [{"locale": "ar", "label": "أبيض"}, {"locale": "en", "label": "White"}]},
            {"code": "color-off-white", "hex_color": "#F3EFE7", "sort_order": 2, "translations": [{"locale": "ar", "label": "أبيض مكسور"}, {"locale": "en", "label": "Off-White"}]},
            {"code": "color-ivory", "hex_color": "#FFFFF0", "sort_order": 3, "translations": [{"locale": "ar", "label": "عاجي"}, {"locale": "en", "label": "Ivory"}]},
            {"code": "color-cream", "hex_color": "#EFE3CC", "sort_order": 4, "translations": [{"locale": "ar", "label": "كريمي"}, {"locale": "en", "label": "Cream"}]},
            {"code": "color-beige", "hex_color": "#D9C7A7", "sort_order": 5, "translations": [{"locale": "ar", "label": "بيج"}, {"locale": "en", "label": "Beige"}]},
            {"code": "color-navy", "hex_color": "#1B263B", "sort_order": 6, "translations": [{"locale": "ar", "label": "كحلي"}, {"locale": "en", "label": "Navy"}]},
            {"code": "color-grey", "hex_color": "#8A8D8F", "sort_order": 7, "translations": [{"locale": "ar", "label": "رمادي"}, {"locale": "en", "label": "Grey"}]},
            {"code": "color-black", "hex_color": "#1A1A1A", "sort_order": 8, "translations": [{"locale": "ar", "label": "أسود"}, {"locale": "en", "label": "Black"}]},
        ],
    },
    {
        "code": "size",
        "input_type": "dropdown",
        "is_filterable": True,
        "sort_order": 3,
        "translations": [
            {"locale": "ar", "label": "المقاس"},
            {"locale": "en", "label": "Size"},
        ],
        "values": [
            # Traditional Saudi Thobe Length Sizes (Inches)
            {"code": "52", "sort_order": 1, "translations": [{"locale": "ar", "label": "52"}, {"locale": "en", "label": "52"}]},
            {"code": "54", "sort_order": 2, "translations": [{"locale": "ar", "label": "54"}, {"locale": "en", "label": "54"}]},
            {"code": "56", "sort_order": 3, "translations": [{"locale": "ar", "label": "56"}, {"locale": "en", "label": "56"}]},
            {"code": "58", "sort_order": 4, "translations": [{"locale": "ar", "label": "58"}, {"locale": "en", "label": "58"}]},
            {"code": "60", "sort_order": 5, "translations": [{"locale": "ar", "label": "60"}, {"locale": "en", "label": "60"}]},
            {"code": "62", "sort_order": 6, "translations": [{"locale": "ar", "label": "62"}, {"locale": "en", "label": "62"}]},
            # Standard Clothing Sizes
            {"code": "size-s", "sort_order": 7, "translations": [{"locale": "ar", "label": "صغير (S)"}, {"locale": "en", "label": "Small (S)"}]},
            {"code": "size-m", "sort_order": 8, "translations": [{"locale": "ar", "label": "متوسط (M)"}, {"locale": "en", "label": "Medium (M)"}]},
            {"code": "size-l", "sort_order": 9, "translations": [{"locale": "ar", "label": "كبير (L)"}, {"locale": "en", "label": "Large (L)"}]},
            {"code": "size-xl", "sort_order": 10, "translations": [{"locale": "ar", "label": "كبير جداً (XL)"}, {"locale": "en", "label": "X-Large (XL)"}]},
            {"code": "size-xxl", "sort_order": 11, "translations": [{"locale": "ar", "label": "كبير جداً جداً (XXL)"}, {"locale": "en", "label": "XX-Large (XXL)"}]},
            # Neck / Collar Sizes
            {"code": "size-37", "sort_order": 12, "translations": [{"locale": "ar", "label": "37"}, {"locale": "en", "label": "37"}]},
            {"code": "size-38", "sort_order": 13, "translations": [{"locale": "ar", "label": "38"}, {"locale": "en", "label": "38"}]},
            {"code": "size-39", "sort_order": 14, "translations": [{"locale": "ar", "label": "39"}, {"locale": "en", "label": "39"}]},
            {"code": "size-40", "sort_order": 15, "translations": [{"locale": "ar", "label": "40"}, {"locale": "en", "label": "40"}]},
            {"code": "size-41", "sort_order": 16, "translations": [{"locale": "ar", "label": "41"}, {"locale": "en", "label": "41"}]},
            {"code": "size-42", "sort_order": 17, "translations": [{"locale": "ar", "label": "42"}, {"locale": "en", "label": "42"}]},
            {"code": "size-44", "sort_order": 18, "translations": [{"locale": "ar", "label": "44"}, {"locale": "en", "label": "44"}]},
            {"code": "size-45", "sort_order": 19, "translations": [{"locale": "ar", "label": "45"}, {"locale": "en", "label": "45"}]},
        ],
    },
]


def seed_options():
    db = SessionLocal()
    try:
        for opt_data in OPTIONS_DATA:
            code = opt_data["code"]
            option = db.query(Option).filter(Option.code == code).first()
            if not option:
                option = Option(
                    code=code,
                    input_type=opt_data["input_type"],
                    is_filterable=opt_data["is_filterable"],
                    sort_order=opt_data["sort_order"],
                )
                db.add(option)
                db.flush()
                print(f"Created option: {code}")
                for tr in opt_data["translations"]:
                    db.add(OptionTranslation(option_id=option.id, locale=tr["locale"], label=tr["label"]))
            else:
                print(f"Option exists: {code}")
                # Update translations if missing
                existing_locales = {t.locale for t in option.translations}
                for tr in opt_data["translations"]:
                    if tr["locale"] not in existing_locales:
                        db.add(OptionTranslation(option_id=option.id, locale=tr["locale"], label=tr["label"]))

            # Process option values
            existing_values = {v.code: v for v in option.values}
            for val_data in opt_data["values"]:
                v_code = val_data["code"]
                if v_code in existing_values:
                    ov = existing_values[v_code]
                    if val_data.get("hex_color") and ov.hex_color != val_data["hex_color"]:
                        ov.hex_color = val_data["hex_color"]
                    print(f"  - Value exists: {v_code}")
                else:
                    ov = OptionValue(
                        option_id=option.id,
                        code=v_code,
                        hex_color=val_data.get("hex_color"),
                        sort_order=val_data.get("sort_order", 0),
                    )
                    db.add(ov)
                    db.flush()
                    for tr in val_data["translations"]:
                        db.add(OptionValueTranslation(option_value_id=ov.id, locale=tr["locale"], label=tr["label"]))
                    print(f"  + Added value: {v_code} ({[t['label'] for t in val_data['translations']]})")

        db.commit()
        print("Successfully seeded options and values!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding options: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_options()
