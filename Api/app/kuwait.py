"""Kuwait's administrative geography, for the delivery address form.

Six governorates, each with its residential areas. This is a stable published
list, not merchandising data an admin edits, so it lives in code rather than in
a table — which also means the storefront's dropdowns and the API agree by
construction instead of by seeding.

Ids are stable slugs, deliberately not database row ids. The regions endpoint
used to return `regions.id` while the area list came from a separate source
keyed by slug, so the two never matched and the city dropdown was always empty.
One vocabulary, used by both ends, is what stops that recurring.

A Kuwaiti address is Governorate → Area → Block → Street → Building. There is
no equivalent of the Saudi National Address short code, and postal codes are
not used in everyday delivery, so neither field appears in the form.
"""

from __future__ import annotations

# (code, name_en, name_ar, areas[(code, name_en, name_ar)])
GOVERNORATES: list[tuple[str, str, str, list[tuple[str, str, str]]]] = [
    (
        "capital",
        "Capital",
        "العاصمة",
        [
            ("kuwait-city", "Kuwait City", "مدينة الكويت"),
            ("sharq", "Sharq", "شرق"),
            ("mirqab", "Mirqab", "المرقاب"),
            ("dasman", "Dasman", "دسمان"),
            ("daiya", "Daiya", "الدعية"),
            ("qibla", "Qibla", "قبلة"),
            ("salhiya", "Salhiya", "الصالحية"),
            ("bneid-al-qar", "Bneid Al Qar", "بنيد القار"),
            ("kaifan", "Kaifan", "كيفان"),
            ("mansouriya", "Mansouriya", "المنصورية"),
            ("abdullah-al-salem", "Abdullah Al Salem", "ضاحية عبدالله السالم"),
            ("nuzha", "Nuzha", "النزهة"),
            ("faiha", "Faiha", "الفيحاء"),
            ("shamiya", "Shamiya", "الشامية"),
            ("rawda", "Rawda", "الروضة"),
            ("adailiya", "Adailiya", "العديلية"),
            ("khaldiya", "Khaldiya", "الخالدية"),
            ("qadsiya", "Qadsiya", "القادسية"),
            ("qortuba", "Qortuba", "قرطبة"),
            ("surra", "Surra", "السرة"),
            ("yarmouk", "Yarmouk", "اليرموك"),
            ("shuwaikh", "Shuwaikh", "الشويخ"),
            ("shuwaikh-industrial", "Shuwaikh Industrial", "الشويخ الصناعية"),
            ("doha", "Doha", "الدوحة"),
            ("sulaibikhat", "Sulaibikhat", "الصليبيخات"),
            ("jaber-al-ahmad", "Jaber Al Ahmad", "جابر الأحمد"),
            ("nahdha", "Nahdha", "النهضة"),
            ("granada", "Granada", "غرناطة"),
            ("shuhada", "Shuhada", "الشهداء"),
        ],
    ),
    (
        "hawalli",
        "Hawalli",
        "حولي",
        [
            ("hawalli-area", "Hawalli", "حولي"),
            ("salmiya", "Salmiya", "السالمية"),
            ("rumaithiya", "Rumaithiya", "الرميثية"),
            ("bayan", "Bayan", "بيان"),
            ("mishref", "Mishref", "مشرف"),
            ("salwa", "Salwa", "سلوى"),
            ("jabriya", "Jabriya", "الجابرية"),
            ("shaab", "Shaab", "الشعب"),
            ("zahra", "Zahra", "الزهراء"),
            ("hitteen", "Hitteen", "حطين"),
            ("salam", "Salam", "السلام"),
            ("siddeeq", "Siddeeq", "الصديق"),
            ("mubarak-al-abdullah", "Mubarak Al Abdullah", "مبارك العبدالله"),
            ("bidaa", "Bidaa", "البدع"),
            ("maidan-hawalli", "Maidan Hawalli", "ميدان حولي"),
            ("nugra", "Nugra", "النقرة"),
        ],
    ),
    (
        "farwaniya",
        "Farwaniya",
        "الفروانية",
        [
            ("farwaniya-area", "Farwaniya", "الفروانية"),
            ("khaitan", "Khaitan", "خيطان"),
            ("jleeb-al-shuyoukh", "Jleeb Al Shuyoukh", "جليب الشيوخ"),
            ("ardiya", "Ardiya", "العارضية"),
            ("rabiya", "Rabiya", "الرابية"),
            ("andalous", "Andalous", "الأندلس"),
            ("rehab", "Rehab", "الرحاب"),
            ("ishbiliya", "Ishbiliya", "إشبيلية"),
            ("firdous", "Firdous", "الفردوس"),
            ("omariya", "Omariya", "العمرية"),
            ("riggae", "Riggae", "الرقعي"),
            ("abdullah-al-mubarak", "Abdullah Al Mubarak", "عبدالله المبارك"),
            ("sabah-al-nasser", "Sabah Al Nasser", "صباح الناصر"),
            ("dhajeej", "Dhajeej", "ضجيج"),
            ("airport", "Airport Area", "منطقة المطار"),
        ],
    ),
    (
        "mubarak-al-kabeer",
        "Mubarak Al Kabeer",
        "مبارك الكبير",
        [
            ("mubarak-al-kabeer-area", "Mubarak Al Kabeer", "مبارك الكبير"),
            ("sabah-al-salem", "Sabah Al Salem", "صباح السالم"),
            ("adan", "Adan", "العدان"),
            ("qurain", "Qurain", "القرين"),
            ("qusour", "Qusour", "القصور"),
            ("messila", "Messila", "المسيلة"),
            ("abu-ftaira", "Abu Ftaira", "أبو فطيرة"),
            ("funaitees", "Funaitees", "الفنيطيس"),
            ("wusta", "Wusta", "الوسطى"),
            ("sabhan", "Sabhan", "صبحان"),
        ],
    ),
    (
        "ahmadi",
        "Ahmadi",
        "الأحمدي",
        [
            ("ahmadi-area", "Ahmadi", "الأحمدي"),
            ("fahaheel", "Fahaheel", "الفحيحيل"),
            ("mangaf", "Mangaf", "المنقف"),
            ("abu-halifa", "Abu Halifa", "أبو حليفة"),
            ("fintas", "Fintas", "الفنطاس"),
            ("mahboula", "Mahboula", "المهبولة"),
            ("riqqa", "Riqqa", "الرقة"),
            ("hadiya", "Hadiya", "هدية"),
            ("sabahiya", "Sabahiya", "الصباحية"),
            ("egaila", "Egaila", "العقيلة"),
            ("jaber-al-ali", "Jaber Al Ali", "جابر العلي"),
            ("fahad-al-ahmad", "Fahad Al Ahmad", "فهد الأحمد"),
            ("ali-sabah-al-salem", "Ali Sabah Al Salem", "علي صباح السالم"),
            ("sabah-al-ahmad", "Sabah Al Ahmad City", "مدينة صباح الأحمد"),
            ("wafra", "Wafra", "الوفرة"),
            ("khiran", "Khiran", "الخيران"),
            ("shuaiba", "Shuaiba", "الشعيبة"),
            ("mina-abdullah", "Mina Abdullah", "ميناء عبدالله"),
        ],
    ),
    (
        "jahra",
        "Jahra",
        "الجهراء",
        [
            ("jahra-area", "Jahra", "الجهراء"),
            ("saad-al-abdullah", "Saad Al Abdullah", "سعد العبدالله"),
            ("naeem", "Naeem", "النعيم"),
            ("nasseem", "Nasseem", "النسيم"),
            ("oyoun", "Oyoun", "العيون"),
            ("qasr", "Qasr", "القصر"),
            ("waha", "Waha", "الواحة"),
            ("taima", "Taima", "تيماء"),
            ("amghara", "Amghara", "أمغرة"),
            ("sulaibiya", "Sulaibiya", "الصليبية"),
            ("kabd", "Kabd", "كبد"),
            ("abdali", "Abdali", "العبدلي"),
            ("salmi", "Salmi", "السالمي"),
            ("mutlaa", "Mutlaa", "المطلاع"),
        ],
    ),
]


def governorates(locale: str) -> list[dict]:
    return [
        {"id": code, "name": name_ar if locale == "ar" else name_en}
        for code, name_en, name_ar, _areas in GOVERNORATES
    ]


def areas(locale: str, region_id: str | None = None) -> list[dict]:
    """Areas, optionally narrowed to one governorate. `region_id` matches the
    governorate code the regions endpoint hands out, so the two dropdowns
    always line up."""
    result = []
    for code, _name_en, _name_ar, area_list in GOVERNORATES:
        if region_id and region_id != code:
            continue
        for area_code, area_en, area_ar in area_list:
            result.append(
                {
                    "id": area_code,
                    "region_id": code,
                    "name": area_ar if locale == "ar" else area_en,
                }
            )
    return result


def governorate_name(code: str, locale: str) -> str | None:
    for gov_code, name_en, name_ar, _areas in GOVERNORATES:
        if gov_code == code:
            return name_ar if locale == "ar" else name_en
    return None


def area_name(code: str, locale: str) -> str | None:
    for _gov_code, _en, _ar, area_list in GOVERNORATES:
        for area_code, area_en, area_ar in area_list:
            if area_code == code:
                return area_ar if locale == "ar" else area_en
    return None
