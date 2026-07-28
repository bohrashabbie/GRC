/** TEMPORARY fixture data — reviews, stores, orders, checkout. See ./README.md. */

import type {
  Address,
  City,
  LocaleCode,
  OrderDetail,
  OrderSummary,
  PaymentMethod,
  Region,
  Review,
  ReviewListResponse,
  ShippingMethod,
  StoreLocation,
} from "@/types/shop";
import { type Bilingual, img, paginate, t } from "./shared";

/* -------------------------------------------------------------------------- */
/* Reviews                                                                    */
/* -------------------------------------------------------------------------- */

const RAW_REVIEWS: {
  rating: number;
  title: Bilingual;
  body: Bilingual;
  author: Bilingual;
  verified: boolean;
  daysAgo: number;
}[] = [
  {
    rating: 5,
    title: t("خامة ممتازة", "Excellent cloth"),
    body: t(
      "الخامة أفضل مما توقعت بكثير، والقصّة مضبوطة. طلبت مقاس 58 وجاء مناسبًا تمامًا.",
      "The fabric is far better than I expected and the cut is exact. I ordered a 58 and it fits perfectly.",
    ),
    author: t("عبدالله م.", "Abdullah M."),
    verified: true,
    daysAgo: 4,
  },
  {
    rating: 4,
    title: t("جيد جدًا", "Very good"),
    body: t(
      "الثوب ممتاز لكن اللون أفتح قليلًا مما يظهر في الصور. ما زلت راضيًا عن الشراء.",
      "The thobe is excellent, though the colour is slightly lighter than the photos. Still happy with the purchase.",
    ),
    author: t("فهد ع.", "Fahad A."),
    verified: true,
    daysAgo: 11,
  },
  {
    rating: 5,
    title: t("سريع التوصيل", "Fast delivery"),
    body: t("وصل خلال يومين، والتغليف مرتب. سأطلب مرة أخرى.", "Arrived in two days and neatly packed. I'll order again."),
    author: t("سعود ر.", "Saud R."),
    verified: true,
    daysAgo: 19,
  },
  {
    rating: 3,
    title: t("مقبول", "Acceptable"),
    body: t(
      "القماش جيد لكنه يحتاج كيًّا بعد كل غسلة. لو كان أقل تجعّدًا لكان ممتازًا.",
      "Good cloth but it needs pressing after every wash. Less creasing would make it excellent.",
    ),
    author: t("ماجد ح.", "Majed H."),
    verified: false,
    daysAgo: 28,
  },
  {
    rating: 5,
    title: t("أنصح به", "Recommended"),
    body: t(
      "اشتريت اثنين بعد التجربة الأولى. التفصيل عند الياقة نظيف جدًا.",
      "I bought a second one after trying the first. The collar finishing is very clean.",
    ),
    author: t("خالد ن.", "Khalid N."),
    verified: true,
    daysAgo: 45,
  },
];

export function fixtureReviews(
  slug: string,
  locale: LocaleCode,
  cursor: string | null,
): ReviewListResponse {
  const reviews: Review[] = RAW_REVIEWS.map((raw, index) => ({
    id: `${slug}-review-${index}`,
    rating: raw.rating,
    title: raw.title[locale],
    body: raw.body[locale],
    author_name: raw.author[locale],
    created_at: new Date(Date.now() - raw.daysAgo * 86_400_000).toISOString(),
    is_verified_purchase: raw.verified,
  }));

  const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const review of reviews) distribution[String(review.rating)] += 1;

  const page = paginate(reviews, cursor, 3);

  return {
    items: page.items,
    next_cursor: page.next_cursor,
    summary: {
      average: Number(
        (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1),
      ),
      count: reviews.length,
      distribution,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Store locations                                                            */
/* -------------------------------------------------------------------------- */

const RAW_STORES: {
  id: string;
  name: Bilingual;
  city: Bilingual;
  address: Bilingual;
  phone: string;
  lat: number;
  lng: number;
  returns: boolean;
}[] = [
  {
    id: "riyadh-olaya",
    name: t("فرع العليا", "Olaya Branch"),
    city: t("الرياض", "Riyadh"),
    address: t("طريق العليا العام، حي العليا", "Olaya Road, Al Olaya District"),
    phone: "0112345678",
    lat: 24.6949,
    lng: 46.6857,
    returns: true,
  },
  {
    id: "riyadh-nakheel",
    name: t("فرع النخيل مول", "Nakheel Mall Branch"),
    city: t("الرياض", "Riyadh"),
    address: t("طريق الملك فهد، حي النخيل", "King Fahd Road, Al Nakheel"),
    phone: "0112345679",
    lat: 24.7599,
    lng: 46.6431,
    returns: true,
  },
  {
    id: "jeddah-tahlia",
    name: t("فرع التحلية", "Tahlia Branch"),
    city: t("جدة", "Jeddah"),
    address: t("شارع الأمير محمد بن عبدالعزيز", "Prince Mohammed Bin Abdulaziz St"),
    phone: "0122345678",
    lat: 21.5810,
    lng: 39.1553,
    returns: true,
  },
  {
    id: "jeddah-redsea",
    name: t("فرع الرد سي مول", "Red Sea Mall Branch"),
    city: t("جدة", "Jeddah"),
    address: t("طريق الملك عبدالعزيز", "King Abdulaziz Road"),
    phone: "0122345679",
    lat: 21.6237,
    lng: 39.1099,
    returns: false,
  },
  {
    id: "dammam-khobar",
    name: t("فرع الخبر", "Khobar Branch"),
    city: t("الدمام", "Dammam"),
    address: t("طريق الملك فهد، الخبر الشمالية", "King Fahd Road, North Khobar"),
    phone: "0132345678",
    lat: 26.2794,
    lng: 50.2083,
    returns: true,
  },
  {
    id: "madinah-central",
    name: t("فرع المدينة", "Madinah Branch"),
    city: t("المدينة المنورة", "Madinah"),
    address: t("طريق الملك عبدالله", "King Abdullah Road"),
    phone: "0142345678",
    lat: 24.4686,
    lng: 39.6142,
    returns: false,
  },
];

export function fixtureStores(locale: LocaleCode): StoreLocation[] {
  return RAW_STORES.map((raw) => ({
    id: raw.id,
    name: raw.name[locale],
    city: raw.city[locale],
    address_line: raw.address[locale],
    phone: raw.phone,
    latitude: raw.lat,
    longitude: raw.lng,
    accepts_returns: raw.returns,
    // Sunday (0) to Thursday (4) trading, Friday and Saturday evening only.
    opening_hours: [0, 1, 2, 3, 4].map((day) => ({ day, opens: "09:00", closes: "23:00" })),
  }));
}

/* -------------------------------------------------------------------------- */
/* Governorates and areas — Kuwait                                            */
/* -------------------------------------------------------------------------- */

const RAW_REGIONS: { id: string; name: Bilingual; cities: { id: string; name: Bilingual }[] }[] = [
  {
    id: "capital",
    name: t("العاصمة", "Capital"),
    cities: [
      { id: "kuwait-city", name: t("مدينة الكويت", "Kuwait City") },
      { id: "sharq", name: t("شرق", "Sharq") },
      { id: "mirqab", name: t("المرقاب", "Mirqab") },
      { id: "dasman", name: t("دسمان", "Dasman") },
      { id: "daiya", name: t("الدعية", "Daiya") },
      { id: "qibla", name: t("قبلة", "Qibla") },
      { id: "salhiya", name: t("الصالحية", "Salhiya") },
      { id: "bneid-al-qar", name: t("بنيد القار", "Bneid Al Qar") },
      { id: "kaifan", name: t("كيفان", "Kaifan") },
      { id: "mansouriya", name: t("المنصورية", "Mansouriya") },
      { id: "abdullah-al-salem", name: t("ضاحية عبدالله السالم", "Abdullah Al Salem") },
      { id: "nuzha", name: t("النزهة", "Nuzha") },
      { id: "faiha", name: t("الفيحاء", "Faiha") },
      { id: "shamiya", name: t("الشامية", "Shamiya") },
      { id: "rawda", name: t("الروضة", "Rawda") },
      { id: "adailiya", name: t("العديلية", "Adailiya") },
      { id: "khaldiya", name: t("الخالدية", "Khaldiya") },
      { id: "qadsiya", name: t("القادسية", "Qadsiya") },
      { id: "qortuba", name: t("قرطبة", "Qortuba") },
      { id: "surra", name: t("السرة", "Surra") },
      { id: "yarmouk", name: t("اليرموك", "Yarmouk") },
      { id: "shuwaikh", name: t("الشويخ", "Shuwaikh") },
      { id: "shuwaikh-industrial", name: t("الشويخ الصناعية", "Shuwaikh Industrial") },
      { id: "doha", name: t("الدوحة", "Doha") },
      { id: "sulaibikhat", name: t("الصليبيخات", "Sulaibikhat") },
      { id: "jaber-al-ahmad", name: t("جابر الأحمد", "Jaber Al Ahmad") },
      { id: "nahdha", name: t("النهضة", "Nahdha") },
      { id: "granada", name: t("غرناطة", "Granada") },
      { id: "shuhada", name: t("الشهداء", "Shuhada") },
    ],
  },
  {
    id: "hawalli",
    name: t("حولي", "Hawalli"),
    cities: [
      { id: "hawalli-area", name: t("حولي", "Hawalli") },
      { id: "salmiya", name: t("السالمية", "Salmiya") },
      { id: "rumaithiya", name: t("الرميثية", "Rumaithiya") },
      { id: "bayan", name: t("بيان", "Bayan") },
      { id: "mishref", name: t("مشرف", "Mishref") },
      { id: "salwa", name: t("سلوى", "Salwa") },
      { id: "jabriya", name: t("الجابرية", "Jabriya") },
      { id: "shaab", name: t("الشعب", "Shaab") },
      { id: "zahra", name: t("الزهراء", "Zahra") },
      { id: "hitteen", name: t("حطين", "Hitteen") },
      { id: "salam", name: t("السلام", "Salam") },
      { id: "siddeeq", name: t("الصديق", "Siddeeq") },
      { id: "mubarak-al-abdullah", name: t("مبارك العبدالله", "Mubarak Al Abdullah") },
      { id: "bidaa", name: t("البدع", "Bidaa") },
      { id: "maidan-hawalli", name: t("ميدان حولي", "Maidan Hawalli") },
      { id: "nugra", name: t("النقرة", "Nugra") },
    ],
  },
  {
    id: "farwaniya",
    name: t("الفروانية", "Farwaniya"),
    cities: [
      { id: "farwaniya-area", name: t("الفروانية", "Farwaniya") },
      { id: "khaitan", name: t("خيطان", "Khaitan") },
      { id: "jleeb-al-shuyoukh", name: t("جليب الشيوخ", "Jleeb Al Shuyoukh") },
      { id: "ardiya", name: t("العارضية", "Ardiya") },
      { id: "rabiya", name: t("الرابية", "Rabiya") },
      { id: "andalous", name: t("الأندلس", "Andalous") },
      { id: "rehab", name: t("الرحاب", "Rehab") },
      { id: "ishbiliya", name: t("إشبيلية", "Ishbiliya") },
      { id: "firdous", name: t("الفردوس", "Firdous") },
      { id: "omariya", name: t("العمرية", "Omariya") },
      { id: "riggae", name: t("الرقعي", "Riggae") },
      { id: "abdullah-al-mubarak", name: t("عبدالله المبارك", "Abdullah Al Mubarak") },
      { id: "sabah-al-nasser", name: t("صباح الناصر", "Sabah Al Nasser") },
      { id: "dhajeej", name: t("ضجيج", "Dhajeej") },
      { id: "airport", name: t("منطقة المطار", "Airport Area") },
    ],
  },
  {
    id: "mubarak-al-kabeer",
    name: t("مبارك الكبير", "Mubarak Al Kabeer"),
    cities: [
      { id: "mubarak-al-kabeer-area", name: t("مبارك الكبير", "Mubarak Al Kabeer") },
      { id: "sabah-al-salem", name: t("صباح السالم", "Sabah Al Salem") },
      { id: "adan", name: t("العدان", "Adan") },
      { id: "qurain", name: t("القرين", "Qurain") },
      { id: "qusour", name: t("القصور", "Qusour") },
      { id: "messila", name: t("المسيلة", "Messila") },
      { id: "abu-ftaira", name: t("أبو فطيرة", "Abu Ftaira") },
      { id: "funaitees", name: t("الفنيطيس", "Funaitees") },
      { id: "wusta", name: t("الوسطى", "Wusta") },
      { id: "sabhan", name: t("صبحان", "Sabhan") },
    ],
  },
  {
    id: "ahmadi",
    name: t("الأحمدي", "Ahmadi"),
    cities: [
      { id: "ahmadi-area", name: t("الأحمدي", "Ahmadi") },
      { id: "fahaheel", name: t("الفحيحيل", "Fahaheel") },
      { id: "mangaf", name: t("المنقف", "Mangaf") },
      { id: "abu-halifa", name: t("أبو حليفة", "Abu Halifa") },
      { id: "fintas", name: t("الفنطاس", "Fintas") },
      { id: "mahboula", name: t("المهبولة", "Mahboula") },
      { id: "riqqa", name: t("الرقة", "Riqqa") },
      { id: "hadiya", name: t("هدية", "Hadiya") },
      { id: "sabahiya", name: t("الصباحية", "Sabahiya") },
      { id: "egaila", name: t("العقيلة", "Egaila") },
      { id: "jaber-al-ali", name: t("جابر العلي", "Jaber Al Ali") },
      { id: "fahad-al-ahmad", name: t("فهد الأحمد", "Fahad Al Ahmad") },
      { id: "ali-sabah-al-salem", name: t("علي صباح السالم", "Ali Sabah Al Salem") },
      { id: "sabah-al-ahmad", name: t("مدينة صباح الأحمد", "Sabah Al Ahmad City") },
      { id: "wafra", name: t("الوفرة", "Wafra") },
      { id: "khiran", name: t("الخيران", "Khiran") },
      { id: "shuaiba", name: t("الشعيبة", "Shuaiba") },
      { id: "mina-abdullah", name: t("ميناء عبدالله", "Mina Abdullah") },
    ],
  },
  {
    id: "jahra",
    name: t("الجهراء", "Jahra"),
    cities: [
      { id: "jahra-area", name: t("الجهراء", "Jahra") },
      { id: "saad-al-abdullah", name: t("سعد العبدالله", "Saad Al Abdullah") },
      { id: "naeem", name: t("النعيم", "Naeem") },
      { id: "nasseem", name: t("النسيم", "Nasseem") },
      { id: "oyoun", name: t("العيون", "Oyoun") },
      { id: "qasr", name: t("القصر", "Qasr") },
      { id: "waha", name: t("الواحة", "Waha") },
      { id: "taima", name: t("تيماء", "Taima") },
      { id: "amghara", name: t("أمغرة", "Amghara") },
      { id: "sulaibiya", name: t("الصليبية", "Sulaibiya") },
      { id: "kabd", name: t("كبد", "Kabd") },
      { id: "abdali", name: t("العبدلي", "Abdali") },
      { id: "salmi", name: t("السالمي", "Salmi") },
      { id: "mutlaa", name: t("المطلاع", "Mutlaa") },
    ],
  },
];

export function fixtureRegions(locale: LocaleCode): Region[] {
  return RAW_REGIONS.map((raw) => ({ id: raw.id, name: raw.name[locale] }));
}

export function fixtureCities(locale: LocaleCode, regionId?: string): City[] {
  return RAW_REGIONS.filter((raw) => !regionId || raw.id === regionId).flatMap((raw) =>
    raw.cities.map((city) => ({
      id: city.id,
      region_id: raw.id,
      name: city.name[locale],
    })),
  );
}

/* -------------------------------------------------------------------------- */
/* Addresses                                                                  */
/* -------------------------------------------------------------------------- */

export function fixtureAddresses(locale: LocaleCode): Address[] {
  const isAr = locale === "ar";
  return [
    {
      id: "addr-1",
      full_name: isAr ? "عبدالله المطيري" : "Abdullah Al Mutairi",
      phone: "51234567",
      governorate_id: "hawalli",
      governorate_name: isAr ? "حولي" : "Hawalli",
      area_id: "salmiya",
      area_name: isAr ? "السالمية" : "Salmiya",
      block: "10",
      street: "1",
      building: "24",
      extra_directions: isAr ? "الدور الثاني، شقة 5" : "Second floor, flat 5",
      is_default: true,
    },
    {
      id: "addr-2",
      full_name: isAr ? "عبدالله المطيري" : "Abdullah Al Mutairi",
      phone: "51234567",
      governorate_id: "capital",
      governorate_name: isAr ? "العاصمة" : "Capital",
      area_id: "qortuba",
      area_name: isAr ? "قرطبة" : "Qortuba",
      block: "3",
      street: "5",
      building: "112",
      extra_directions: null,
      is_default: false,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Shipping and payment methods                                               */
/* -------------------------------------------------------------------------- */

export function fixtureShippingMethods(locale: LocaleCode): ShippingMethod[] {
  const isAr = locale === "ar";
  return [
    {
      id: "standard",
      name: isAr ? "الشحن القياسي" : "Standard delivery",
      description: isAr ? "مجاني للطلبات فوق 200 ريال" : "Free on orders over 200 SAR",
      price: "25.00",
      estimated_days: { min: 2, max: 4 },
      carrier_name: "SMSA",
    },
    {
      id: "express",
      name: isAr ? "الشحن السريع" : "Express delivery",
      description: isAr ? "توصيل في اليوم التالي" : "Next-day delivery",
      price: "45.00",
      estimated_days: { min: 1, max: 1 },
      carrier_name: "Aramex",
    },
    {
      id: "pickup",
      name: isAr ? "الاستلام من الفرع" : "Collect in store",
      description: isAr ? "جاهز خلال 3 ساعات" : "Ready within 3 hours",
      price: "0.00",
      estimated_days: null,
      carrier_name: null,
    },
  ];
}

export function fixturePaymentMethods(locale: LocaleCode): PaymentMethod[] {
  const isAr = locale === "ar";
  return [
    { code: "mada", name: "mada", description: null, surcharge: null, is_available: true },
    {
      code: "card",
      name: isAr ? "بطاقة ائتمانية" : "Credit card",
      description: "Visa · Mastercard",
      surcharge: null,
      is_available: true,
    },
    { code: "apple_pay", name: "Apple Pay", description: null, surcharge: null, is_available: true },
    {
      code: "tamara",
      name: "Tamara",
      description: isAr ? "قسّمها على 4 دفعات" : "Split into 4 payments",
      surcharge: null,
      is_available: true,
    },
    {
      code: "cod",
      name: isAr ? "الدفع عند الاستلام" : "Cash on delivery",
      description: isAr ? "رسوم إضافية 15 ريال" : "15 SAR surcharge",
      surcharge: "15.00",
      is_available: true,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Orders                                                                     */
/* -------------------------------------------------------------------------- */

const RAW_ORDERS: {
  number: string;
  status: OrderSummary["status"];
  daysAgo: number;
  total: string;
  items: { name: Bilingual; sku: string; options: Bilingual; price: string; qty: number; image: number }[];
}[] = [
  {
    number: "GRC-10482",
    status: "delivered",
    daysAgo: 22,
    total: "738.00",
    items: [
      {
        name: t("ثوب سعودي كلاسيكي — عاجي", "Classic Saudi Thobe — Ivory"),
        sku: "CLASSICS-3",
        options: t("عاجي · 58 · كبك", "Ivory · 58 · Cuff"),
        price: "349.00",
        qty: 2,
        image: 1,
      },
    ],
  },
  {
    number: "GRC-10517",
    status: "shipped",
    daysAgo: 5,
    total: "434.00",
    items: [
      {
        name: t("ثوب صيفي مزيج كتان", "Summer Thobe — Linen Blend"),
        sku: "SUMMERT-2",
        options: t("أبيض · 56 · زرار", "White · 56 · Button"),
        price: "289.00",
        qty: 1,
        image: 3,
      },
      {
        name: t("شماغ فاخر — أحمر", "Premium Shemagh — Red"),
        sku: "PREMIUMS-1",
        options: t("أحمر", "Red"),
        price: "145.00",
        qty: 1,
        image: 8,
      },
    ],
  },
  {
    number: "GRC-10530",
    status: "processing",
    daysAgo: 1,
    total: "425.00",
    items: [
      {
        name: t("ثوب رسمي بياقة فرنسية", "Formal Thobe — French Collar"),
        sku: "FORMALTH-5",
        options: t("عاجي · 60 · كبك", "Ivory · 60 · Cuff"),
        price: "425.00",
        qty: 1,
        image: 5,
      },
    ],
  },
];

const STATUS_FLOW: OrderSummary["status"][] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];

export function fixtureOrders(locale: LocaleCode): OrderSummary[] {
  // The summary carries no translated text, but the parameter stays so this
  // matches the signature of the endpoint it stands in for.
  void locale;

  return RAW_ORDERS.map((raw) => ({
    id: raw.number,
    order_number: raw.number,
    status: raw.status,
    placed_at: new Date(Date.now() - raw.daysAgo * 86_400_000).toISOString(),
    item_count: raw.items.reduce((sum, item) => sum + item.qty, 0),
    grand_total: raw.total,
  }));
}

export function fixtureOrder(orderNumber: string, locale: LocaleCode): OrderDetail | null {
  const raw = RAW_ORDERS.find((o) => o.number === orderNumber);
  if (!raw) return null;

  const placedAt = Date.now() - raw.daysAgo * 86_400_000;
  const reachedIndex = STATUS_FLOW.indexOf(raw.status);
  const subtotal = raw.items.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
  const isAr = locale === "ar";

  return {
    id: raw.number,
    order_number: raw.number,
    status: raw.status,
    placed_at: new Date(placedAt).toISOString(),
    item_count: raw.items.reduce((sum, item) => sum + item.qty, 0),
    grand_total: raw.total,
    lines: raw.items.map((item, index) => ({
      id: `${raw.number}-line-${index}`,
      name_snapshot: item.name[locale],
      sku_snapshot: item.sku,
      options_snapshot: item.options[locale],
      unit_price_snapshot: item.price,
      quantity: item.qty,
      line_total: (Number(item.price) * item.qty).toFixed(2),
      image: img(item.image, item.name[locale]),
      product_slug: null,
    })),
    totals: {
      subtotal: subtotal.toFixed(2),
      discount_total: "0.00",
      shipping_total: subtotal >= 200 ? "0.00" : "25.00",
      tax_total: (subtotal - subtotal / 1.15).toFixed(2),
      grand_total: raw.total,
      free_shipping_remaining: null,
      free_shipping_threshold: "200.00",
    },
    shipping_address: fixtureAddresses(locale)[0],
    shipping_method_name: isAr ? "الشحن القياسي" : "Standard delivery",
    payment_method_name: "mada",
    timeline: STATUS_FLOW.slice(0, reachedIndex + 1).map((status, index) => ({
      status,
      occurred_at: new Date(placedAt + index * 86_400_000).toISOString(),
      note: null,
    })),
    tracking_number: reachedIndex >= 3 ? "SMSA283746152" : null,
    tracking_url: reachedIndex >= 3 ? "https://smsaexpress.com/trackingdetails" : null,
  };
}

export function fixtureOrderNumbers(): string[] {
  return RAW_ORDERS.map((raw) => raw.number);
}
