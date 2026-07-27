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
/* Regions and cities — Saudi National Address                                */
/* -------------------------------------------------------------------------- */

const RAW_REGIONS: { id: string; name: Bilingual; cities: { id: string; name: Bilingual }[] }[] = [
  {
    id: "riyadh",
    name: t("منطقة الرياض", "Riyadh Region"),
    cities: [
      { id: "riyadh-city", name: t("الرياض", "Riyadh") },
      { id: "kharj", name: t("الخرج", "Al Kharj") },
      { id: "diriyah", name: t("الدرعية", "Diriyah") },
    ],
  },
  {
    id: "makkah",
    name: t("منطقة مكة المكرمة", "Makkah Region"),
    cities: [
      { id: "jeddah", name: t("جدة", "Jeddah") },
      { id: "makkah-city", name: t("مكة المكرمة", "Makkah") },
      { id: "taif", name: t("الطائف", "Taif") },
    ],
  },
  {
    id: "eastern",
    name: t("المنطقة الشرقية", "Eastern Province"),
    cities: [
      { id: "dammam", name: t("الدمام", "Dammam") },
      { id: "khobar", name: t("الخبر", "Khobar") },
      { id: "dhahran", name: t("الظهران", "Dhahran") },
    ],
  },
  {
    id: "madinah",
    name: t("منطقة المدينة المنورة", "Madinah Region"),
    cities: [{ id: "madinah-city", name: t("المدينة المنورة", "Madinah") }],
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
      phone: "0551234567",
      short_address: "RRRD2929",
      building_number: "2929",
      street: isAr ? "طريق الملك عبدالعزيز" : "King Abdulaziz Road",
      district: isAr ? "حي الملقا" : "Al Malqa District",
      city_id: "riyadh-city",
      city_name: isAr ? "الرياض" : "Riyadh",
      region_id: "riyadh",
      region_name: isAr ? "منطقة الرياض" : "Riyadh Region",
      postal_code: "13521",
      additional_number: "7714",
      is_default: true,
    },
    {
      id: "addr-2",
      full_name: isAr ? "عبدالله المطيري" : "Abdullah Al Mutairi",
      phone: "0551234567",
      short_address: "JEDA4412",
      building_number: "4412",
      street: isAr ? "شارع الأمير سلطان" : "Prince Sultan Street",
      district: isAr ? "حي الروضة" : "Al Rawdah District",
      city_id: "jeddah",
      city_name: isAr ? "جدة" : "Jeddah",
      region_id: "makkah",
      region_name: isAr ? "منطقة مكة المكرمة" : "Makkah Region",
      postal_code: "23434",
      additional_number: "6621",
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
    number: "GR8-10482",
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
    number: "GR8-10517",
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
    number: "GR8-10530",
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
