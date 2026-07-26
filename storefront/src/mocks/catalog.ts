/** TEMPORARY fixture data — catalogue. See ./README.md. */

import type {
  CategoryNode,
  Facet,
  LocaleCode,
  ProductCard,
  ProductDetail,
  ProductListResponse,
  ProductOption,
  ProductVariant,
} from "@/types/shop";
import { type Bilingual, img, paginate, t } from "./shared";

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

interface RawCategory {
  slug: string;
  name: Bilingual;
  image?: number;
  count: number;
  children?: RawCategory[];
}

const RAW_CATEGORIES: RawCategory[] = [
  {
    slug: "thobes",
    name: t("الثياب", "Thobes"),
    image: 1,
    count: 248,
    children: [
      { slug: "thobes-saudi", name: t("ثوب سعودي", "Saudi Thobes"), count: 96 },
      { slug: "thobes-emirati", name: t("ثوب إماراتي", "Emirati Thobes"), count: 42 },
      { slug: "thobes-kuwaiti", name: t("ثوب كويتي", "Kuwaiti Thobes"), count: 31 },
      { slug: "thobes-summer", name: t("ثياب صيفية", "Summer Thobes"), count: 58 },
      { slug: "thobes-winter", name: t("ثياب شتوية", "Winter Thobes"), count: 47 },
      { slug: "thobes-boys", name: t("ثياب أولاد", "Boys' Thobes"), count: 34 },
    ],
  },
  {
    slug: "shemagh-ghutra",
    name: t("الشماغ والغترة", "Shemagh & Ghutra"),
    image: 2,
    count: 86,
    children: [
      { slug: "shemagh", name: t("شماغ", "Shemagh"), count: 44 },
      { slug: "ghutra", name: t("غترة", "Ghutra"), count: 28 },
      { slug: "igal", name: t("عقال", "Igal"), count: 14 },
      { slug: "taqiyah", name: t("طاقية", "Taqiyah"), count: 22 },
    ],
  },
  {
    slug: "bisht",
    name: t("البشوت", "Bisht"),
    image: 3,
    count: 37,
    children: [
      { slug: "bisht-formal", name: t("بشت رسمي", "Formal Bisht"), count: 19 },
      { slug: "bisht-wedding", name: t("بشت أعراس", "Wedding Bisht"), count: 12 },
    ],
  },
  {
    slug: "innerwear",
    name: t("الملابس الداخلية", "Innerwear"),
    image: 4,
    count: 64,
    children: [
      { slug: "fanila", name: t("فنايل", "Undershirts"), count: 26 },
      { slug: "sirwal", name: t("سراويل", "Sirwal"), count: 21 },
      { slug: "socks", name: t("جوارب", "Socks"), count: 17 },
    ],
  },
  {
    slug: "footwear",
    name: t("الأحذية", "Footwear"),
    image: 5,
    count: 73,
    children: [
      { slug: "sandals", name: t("نعال", "Sandals"), count: 38 },
      { slug: "formal-shoes", name: t("أحذية رسمية", "Formal Shoes"), count: 24 },
      { slug: "slippers", name: t("شباشب", "Slippers"), count: 11 },
    ],
  },
  {
    slug: "accessories",
    name: t("الإكسسوارات", "Accessories"),
    image: 6,
    count: 91,
    children: [
      { slug: "fragrance", name: t("العطور والعود", "Fragrance & Oud"), count: 33 },
      { slug: "cufflinks", name: t("أزرار الأكمام", "Cufflinks"), count: 18 },
      { slug: "belts", name: t("أحزمة", "Belts"), count: 15 },
      { slug: "wallets", name: t("محافظ", "Wallets"), count: 25 },
    ],
  },
  {
    slug: "women",
    name: t("قسم النساء", "Women"),
    image: 7,
    count: 58,
    children: [
      { slug: "abaya", name: t("عبايات", "Abayas"), count: 34 },
      { slug: "shayla", name: t("شيلة", "Shayla"), count: 24 },
    ],
  },
];

function toCategoryNode(raw: RawCategory, locale: LocaleCode): CategoryNode {
  return {
    id: raw.slug,
    slug: raw.slug,
    name: raw.name[locale],
    image: raw.image ? img(raw.image, raw.name[locale]) : null,
    product_count: raw.count,
    children: (raw.children ?? []).map((child) => toCategoryNode(child, locale)),
  };
}

export function fixtureCategoryTree(locale: LocaleCode): CategoryNode[] {
  return RAW_CATEGORIES.map((raw) => toCategoryNode(raw, locale));
}

export function fixtureCategory(slug: string, locale: LocaleCode): CategoryNode | null {
  const tree = fixtureCategoryTree(locale);
  for (const top of tree) {
    if (top.slug === slug) return top;
    const child = top.children.find((c) => c.slug === slug);
    if (child) return child;
  }
  return null;
}

/** Ancestor chain for breadcrumbs, root-first, excluding the node itself. */
export function fixtureCategoryPath(slug: string, locale: LocaleCode): CategoryNode[] {
  for (const top of fixtureCategoryTree(locale)) {
    if (top.slug === slug) return [];
    if (top.children.some((c) => c.slug === slug)) return [top];
  }
  return [];
}

/* -------------------------------------------------------------------------- */
/* Colours and sizes — shared option vocabulary                               */
/* -------------------------------------------------------------------------- */

const COLOURS: Record<string, { name: Bilingual; hex: string }> = {
  ivory: { name: t("عاجي", "Ivory"), hex: "#F3EFE6" },
  white: { name: t("أبيض", "White"), hex: "#FAFAF7" },
  sand: { name: t("رملي", "Sand"), hex: "#D9CDB6" },
  beige: { name: t("بيج", "Beige"), hex: "#CDBFA4" },
  charcoal: { name: t("فحمي", "Charcoal"), hex: "#2E2E2E" },
  navy: { name: t("كحلي", "Navy"), hex: "#2A3446" },
  sky: { name: t("سماوي", "Sky"), hex: "#BFD3DE" },
  olive: { name: t("زيتي", "Olive"), hex: "#6B6B47" },
  black: { name: t("أسود", "Black"), hex: "#17171A" },
  red: { name: t("أحمر", "Red"), hex: "#9B2E2A" },
};

const SIZES = ["52", "54", "56", "58", "60", "62", "64"];

const SLEEVES: Record<string, Bilingual> = {
  cuff: t("كبك", "Cuff"),
  button: t("زرار", "Button"),
};

/* -------------------------------------------------------------------------- */
/* Products                                                                   */
/* -------------------------------------------------------------------------- */

interface RawProduct {
  slug: string;
  name: Bilingual;
  price: string;
  compareAt?: string;
  image: number;
  stock: ProductCard["stock_state"];
  badges: ProductCard["badges"];
  colours: string[];
  categories: string[];
  fabric: Bilingual;
  collar: Bilingual;
  season: Bilingual;
  rating?: { average: number; count: number };
}

const RAW_PRODUCTS: RawProduct[] = [
  {
    slug: "classic-saudi-thobe-ivory",
    name: t("ثوب سعودي كلاسيكي — عاجي", "Classic Saudi Thobe — Ivory"),
    price: "349.00",
    compareAt: "449.00",
    image: 1,
    stock: "in_stock",
    badges: ["sale", "best_seller"],
    colours: ["ivory", "sand", "charcoal"],
    categories: ["thobes", "thobes-saudi"],
    fabric: t("قطن مصري", "Egyptian cotton"),
    collar: t("ياقة كلاسيكية", "Classic collar"),
    season: t("كل المواسم", "All seasons"),
    rating: { average: 4.6, count: 128 },
  },
  {
    slug: "summer-thobe-linen-blend",
    name: t("ثوب صيفي مزيج كتان", "Summer Thobe — Linen Blend"),
    price: "289.00",
    image: 3,
    stock: "low_stock",
    badges: ["new"],
    colours: ["white", "sky"],
    categories: ["thobes", "thobes-summer"],
    fabric: t("مزيج كتان", "Linen blend"),
    collar: t("ياقة قصيرة", "Short collar"),
    season: t("صيفي", "Summer"),
    rating: { average: 4.2, count: 41 },
  },
  {
    slug: "formal-thobe-french-collar",
    name: t("ثوب رسمي بياقة فرنسية", "Formal Thobe — French Collar"),
    price: "425.00",
    image: 5,
    stock: "in_stock",
    badges: ["limited"],
    colours: ["ivory", "beige"],
    categories: ["thobes", "thobes-saudi"],
    fabric: t("قطن مخلوط", "Cotton blend"),
    collar: t("ياقة فرنسية", "French collar"),
    season: t("كل المواسم", "All seasons"),
    rating: { average: 4.8, count: 76 },
  },
  {
    slug: "winter-thobe-wool-touch",
    name: t("ثوب شتوي بلمسة صوف", "Winter Thobe — Wool Touch"),
    price: "399.00",
    compareAt: "520.00",
    image: 7,
    stock: "out_of_stock",
    badges: ["sale"],
    colours: ["navy", "charcoal"],
    categories: ["thobes", "thobes-winter"],
    fabric: t("مزيج صوف", "Wool blend"),
    collar: t("ياقة كلاسيكية", "Classic collar"),
    season: t("شتوي", "Winter"),
    rating: { average: 4.4, count: 53 },
  },
  {
    slug: "emirati-thobe-kandura",
    name: t("ثوب إماراتي — كندورة", "Emirati Thobe — Kandura"),
    price: "379.00",
    image: 2,
    stock: "in_stock",
    badges: ["best_seller"],
    colours: ["white", "ivory", "beige"],
    categories: ["thobes", "thobes-emirati"],
    fabric: t("قطن ياباني", "Japanese cotton"),
    collar: t("بدون ياقة", "Collarless"),
    season: t("كل المواسم", "All seasons"),
    rating: { average: 4.7, count: 94 },
  },
  {
    slug: "kuwaiti-thobe-slim",
    name: t("ثوب كويتي — قصة ضيقة", "Kuwaiti Thobe — Slim Fit"),
    price: "319.00",
    compareAt: "389.00",
    image: 4,
    stock: "in_stock",
    badges: ["sale"],
    colours: ["ivory", "olive"],
    categories: ["thobes", "thobes-kuwaiti"],
    fabric: t("قطن مصري", "Egyptian cotton"),
    collar: t("ياقة قصيرة", "Short collar"),
    season: t("كل المواسم", "All seasons"),
    rating: { average: 4.1, count: 37 },
  },
  {
    slug: "boys-thobe-easy-care",
    name: t("ثوب أولاد — سهل العناية", "Boys' Thobe — Easy Care"),
    price: "179.00",
    image: 6,
    stock: "in_stock",
    badges: [],
    colours: ["white", "sand"],
    categories: ["thobes", "thobes-boys"],
    fabric: t("بوليستر قطني", "Poly-cotton"),
    collar: t("ياقة كلاسيكية", "Classic collar"),
    season: t("كل المواسم", "All seasons"),
    rating: { average: 4.3, count: 62 },
  },
  {
    slug: "premium-shemagh-red",
    name: t("شماغ فاخر — أحمر", "Premium Shemagh — Red"),
    price: "145.00",
    image: 8,
    stock: "in_stock",
    badges: ["best_seller"],
    colours: ["red", "white"],
    categories: ["shemagh-ghutra", "shemagh"],
    fabric: t("قطن فاخر", "Premium cotton"),
    collar: t("غير مطبق", "Not applicable"),
    season: t("شتوي", "Winter"),
    rating: { average: 4.9, count: 210 },
  },
  {
    slug: "ghutra-cotton-white",
    name: t("غترة قطنية بيضاء", "Cotton Ghutra — White"),
    price: "95.00",
    image: 3,
    stock: "in_stock",
    badges: [],
    colours: ["white"],
    categories: ["shemagh-ghutra", "ghutra"],
    fabric: t("قطن", "Cotton"),
    collar: t("غير مطبق", "Not applicable"),
    season: t("صيفي", "Summer"),
    rating: { average: 4.5, count: 88 },
  },
  {
    slug: "formal-bisht-gold-trim",
    name: t("بشت رسمي بحاشية ذهبية", "Formal Bisht — Gold Trim"),
    price: "1250.00",
    compareAt: "1600.00",
    image: 5,
    stock: "low_stock",
    badges: ["sale", "limited"],
    colours: ["black", "beige"],
    categories: ["bisht", "bisht-formal"],
    fabric: t("صوف وحرير", "Wool and silk"),
    collar: t("غير مطبق", "Not applicable"),
    season: t("شتوي", "Winter"),
    rating: { average: 5, count: 19 },
  },
  {
    slug: "cotton-undershirt-pack",
    name: t("فنيلة قطنية — عبوة 3", "Cotton Undershirt — 3 Pack"),
    price: "89.00",
    image: 7,
    stock: "in_stock",
    badges: [],
    colours: ["white"],
    categories: ["innerwear", "fanila"],
    fabric: t("قطن", "Cotton"),
    collar: t("غير مطبق", "Not applicable"),
    season: t("كل المواسم", "All seasons"),
    rating: { average: 4.0, count: 145 },
  },
  {
    slug: "leather-sandals-classic",
    name: t("نعال جلدية كلاسيكية", "Classic Leather Sandals"),
    price: "265.00",
    image: 1,
    stock: "in_stock",
    badges: ["new"],
    colours: ["black", "beige"],
    categories: ["footwear", "sandals"],
    fabric: t("جلد طبيعي", "Genuine leather"),
    collar: t("غير مطبق", "Not applicable"),
    season: t("كل المواسم", "All seasons"),
    rating: { average: 4.4, count: 57 },
  },
];

function toProductCard(raw: RawProduct, locale: LocaleCode): ProductCard {
  return {
    id: raw.slug,
    slug: raw.slug,
    name: raw.name[locale],
    brand: { id: "grc", slug: "grc", name: "GRC" },
    primary_image: img(raw.image, raw.name[locale]),
    hover_image: img(raw.image + 1, raw.name[locale]),
    price: raw.price,
    compare_at_price: raw.compareAt ?? null,
    stock_state: raw.stock,
    colour_swatches: raw.colours.map((key) => ({
      option_value_id: `colour-${key}`,
      name: COLOURS[key].name[locale],
      hex: COLOURS[key].hex,
      image: null,
    })),
    badges: raw.badges,
  };
}

export function fixtureProducts(locale: LocaleCode): ProductCard[] {
  return RAW_PRODUCTS.map((raw) => toProductCard(raw, locale));
}

/* -------------------------------------------------------------------------- */
/* Listing with facets                                                        */
/* -------------------------------------------------------------------------- */

export interface ListQuery {
  category?: string;
  q?: string;
  colour?: string[];
  size?: string[];
  season?: string[];
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  cursor?: string | null;
}

function matches(raw: RawProduct, query: ListQuery, locale: LocaleCode): boolean {
  if (query.category && !raw.categories.includes(query.category)) return false;

  if (query.q) {
    const needle = query.q.toLowerCase();
    const haystack = `${raw.name.ar} ${raw.name.en} ${raw.slug}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  if (query.colour?.length && !raw.colours.some((c) => query.colour!.includes(c))) return false;

  if (query.season?.length) {
    const seasonKey = raw.season.en.toLowerCase().replace(/\s+/g, "-");
    if (!query.season.includes(seasonKey)) return false;
  }

  const price = Number(raw.price);
  if (query.minPrice !== undefined && price < query.minPrice) return false;
  if (query.maxPrice !== undefined && price > query.maxPrice) return false;

  // `size` is a variant-level facet; every product here carries the full run,
  // so it never excludes. Kept so the UI wiring is exercised end to end.
  void locale;
  return true;
}

function sortProducts(list: RawProduct[], sort: string | undefined): RawProduct[] {
  const sorted = [...list];
  switch (sort) {
    case "price_asc":
      return sorted.sort((a, b) => Number(a.price) - Number(b.price));
    case "price_desc":
      return sorted.sort((a, b) => Number(b.price) - Number(a.price));
    case "rating":
      return sorted.sort((a, b) => (b.rating?.average ?? 0) - (a.rating?.average ?? 0));
    case "newest":
      return sorted.sort(
        (a, b) => Number(b.badges.includes("new")) - Number(a.badges.includes("new")),
      );
    default:
      return sorted;
  }
}

function buildFacets(pool: RawProduct[], locale: LocaleCode): Facet[] {
  const colourCounts = new Map<string, number>();
  const seasonCounts = new Map<string, { label: string; count: number }>();

  for (const raw of pool) {
    for (const colour of raw.colours) {
      colourCounts.set(colour, (colourCounts.get(colour) ?? 0) + 1);
    }
    const key = raw.season.en.toLowerCase().replace(/\s+/g, "-");
    const existing = seasonCounts.get(key);
    seasonCounts.set(key, {
      label: raw.season[locale],
      count: (existing?.count ?? 0) + 1,
    });
  }

  const prices = pool.map((raw) => Number(raw.price));

  return [
    {
      code: "colour",
      label: locale === "ar" ? "اللون" : "Colour",
      type: "swatch",
      values: [...colourCounts.entries()].map(([key, count]) => ({
        value: key,
        label: COLOURS[key].name[locale],
        count,
        hex: COLOURS[key].hex,
      })),
      range: null,
    },
    {
      code: "size",
      label: locale === "ar" ? "المقاس" : "Size",
      type: "checkbox",
      values: SIZES.map((size) => ({ value: size, label: size, count: pool.length, hex: null })),
      range: null,
    },
    {
      code: "season",
      label: locale === "ar" ? "الموسم" : "Season",
      type: "checkbox",
      values: [...seasonCounts.entries()].map(([key, meta]) => ({
        value: key,
        label: meta.label,
        count: meta.count,
        hex: null,
      })),
      range: null,
    },
    {
      code: "price",
      label: locale === "ar" ? "السعر" : "Price",
      type: "range",
      values: [],
      range: prices.length
        ? { min: String(Math.min(...prices)), max: String(Math.max(...prices)) }
        : { min: "0", max: "0" },
    },
  ];
}

export function fixtureProductList(query: ListQuery, locale: LocaleCode): ProductListResponse {
  // Facets are computed from everything the category/search matches, before
  // the facet filters themselves are applied — otherwise selecting one colour
  // would zero out the counts for every other colour.
  const scoped = RAW_PRODUCTS.filter((raw) =>
    matches(raw, { category: query.category, q: query.q }, locale),
  );
  const filtered = sortProducts(
    scoped.filter((raw) => matches(raw, query, locale)),
    query.sort,
  );

  const page = paginate(filtered, query.cursor ?? null, 8);

  return {
    items: page.items.map((raw) => toProductCard(raw, locale)),
    next_cursor: page.next_cursor,
    facets: buildFacets(scoped, locale),
    total_count: filtered.length,
    applied: {
      colour: query.colour ?? [],
      size: query.size ?? [],
      season: query.season ?? [],
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Product detail                                                             */
/* -------------------------------------------------------------------------- */

function buildOptions(raw: RawProduct, locale: LocaleCode): ProductOption[] {
  const options: ProductOption[] = [
    {
      id: "colour",
      code: "colour",
      name: locale === "ar" ? "اللون" : "Colour",
      input_type: "swatch",
      values: raw.colours.map((key) => ({
        id: `colour-${key}`,
        name: COLOURS[key].name[locale],
        hex: COLOURS[key].hex,
        image: null,
      })),
    },
  ];

  // Only garments sized by the thobe run get a size axis; a shemagh does not.
  if (raw.categories.includes("thobes")) {
    options.push({
      id: "size",
      code: "size",
      name: locale === "ar" ? "المقاس" : "Size",
      input_type: "button",
      values: SIZES.map((size) => ({ id: `size-${size}`, name: size, hex: null, image: null })),
    });
    options.push({
      id: "sleeve",
      code: "sleeve",
      name: locale === "ar" ? "الأكمام" : "Sleeve",
      input_type: "button",
      values: Object.entries(SLEEVES).map(([key, name]) => ({
        id: `sleeve-${key}`,
        name: name[locale],
        hex: null,
        image: null,
      })),
    });
  }

  return options;
}

/**
 * Variants are built explicitly, and deliberately NOT as a full cartesian
 * product — a few combinations are omitted so the PDP has real holes to grey
 * out. A UI that assumes every combination exists is the bug this guards.
 */
function buildVariants(raw: RawProduct, options: ProductOption[]): ProductVariant[] {
  const variants: ProductVariant[] = [];
  const colours = options.find((o) => o.id === "colour")!.values;
  const sizes = options.find((o) => o.id === "size")?.values ?? [null];
  const sleeves = options.find((o) => o.id === "sleeve")?.values ?? [null];

  let index = 0;
  for (const colour of colours) {
    for (const size of sizes) {
      for (const sleeve of sleeves) {
        index += 1;

        // Holes: the largest size is never made with a cuff sleeve, and the
        // last colour skips the smallest size.
        const isLargestCuff = size?.name === "64" && sleeve?.id === "sleeve-cuff";
        const isLastColourSmallest =
          colour.id === colours[colours.length - 1].id && size?.name === "52";
        if (isLargestCuff || isLastColourSmallest) continue;

        const optionValues: Record<string, string> = { colour: colour.id };
        if (size) optionValues.size = size.id;
        if (sleeve) optionValues.sleeve = sleeve.id;

        const soldOut = raw.stock === "out_of_stock";
        const low = raw.stock === "low_stock" || index % 7 === 0;

        variants.push({
          id: `${raw.slug}-v${index}`,
          sku: `${raw.slug.toUpperCase().slice(0, 8)}-${index}`,
          price: raw.price,
          compare_at_price: raw.compareAt ?? null,
          stock_state: soldOut ? "out_of_stock" : low ? "low_stock" : "in_stock",
          available_quantity: soldOut ? 0 : low ? 3 : null,
          option_values: optionValues,
        });
      }
    }
  }

  return variants;
}

export function fixtureProductDetail(slug: string, locale: LocaleCode): ProductDetail | null {
  const raw = RAW_PRODUCTS.find((p) => p.slug === slug);
  if (!raw) return null;

  const options = buildOptions(raw, locale);
  const variants = buildVariants(raw, options);
  const path = fixtureCategoryPath(raw.categories[raw.categories.length - 1], locale);
  const leaf = fixtureCategory(raw.categories[raw.categories.length - 1], locale);

  const description =
    locale === "ar"
      ? "<p>قطعة مصنوعة بعناية من خامات مختارة، بقصّة تحافظ على شكلها طوال اليوم. تفاصيل الخياطة منفّذة يدويًا عند الياقة والأكمام.</p><p>يُنصح بالغسيل على درجة حرارة منخفضة والكي على حرارة متوسطة.</p>"
      : "<p>Cut from selected materials with a line that holds its shape through the day. Collar and cuff detailing is finished by hand.</p><p>Wash cool and press on a medium setting.</p>";

  return {
    id: raw.slug,
    slug: raw.slug,
    name: raw.name[locale],
    description_html: description,
    brand: { id: "grc", slug: "grc", name: "GRC" },
    breadcrumbs: [
      ...path.map((node) => ({ slug: node.slug, name: node.name })),
      ...(leaf ? [{ slug: leaf.slug, name: leaf.name }] : []),
    ],
    options,
    variants,
    // Each colour gets its own shots so the gallery can filter on selection,
    // plus one shared image that shows for every colour.
    media: [
      ...raw.colours.flatMap((key, i) => [
        { ...img(raw.image + i, raw.name[locale]), option_value_id: `colour-${key}` },
        { ...img(raw.image + i + 1, raw.name[locale]), option_value_id: `colour-${key}` },
      ]),
      { ...img(raw.image + 4, raw.name[locale]), option_value_id: null },
    ],
    attributes: [
      {
        code: "fabric",
        name: locale === "ar" ? "الخامة" : "Fabric",
        value: raw.fabric[locale],
        group: null,
      },
      {
        code: "collar",
        name: locale === "ar" ? "الياقة" : "Collar",
        value: raw.collar[locale],
        group: null,
      },
      {
        code: "season",
        name: locale === "ar" ? "الموسم" : "Season",
        value: raw.season[locale],
        group: null,
      },
      {
        code: "origin",
        name: locale === "ar" ? "بلد الصنع" : "Made in",
        value: locale === "ar" ? "المملكة العربية السعودية" : "Saudi Arabia",
        group: null,
      },
    ],
    price_range: { min: raw.price, max: raw.price },
    rating: raw.rating ?? null,
    seo: {
      title: raw.name[locale],
      description: raw.name[locale],
      canonical_path: `/p/${raw.slug}`,
      alternates: { ar: `/ar/p/${raw.slug}`, en: `/en/p/${raw.slug}` },
      json_ld: null,
    },
  };
}

export function fixtureRelatedProducts(slug: string, locale: LocaleCode): ProductCard[] {
  const raw = RAW_PRODUCTS.find((p) => p.slug === slug);
  if (!raw) return [];

  return RAW_PRODUCTS.filter(
    (candidate) => candidate.slug !== slug && candidate.categories[0] === raw.categories[0],
  )
    .slice(0, 4)
    .map((candidate) => toProductCard(candidate, locale));
}

export function fixtureProductSlugs(): string[] {
  return RAW_PRODUCTS.map((raw) => raw.slug);
}

export { COLOURS, RAW_PRODUCTS, SIZES };
