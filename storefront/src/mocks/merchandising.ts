/** TEMPORARY fixture data — banners, collections, menus, pages. See ./README.md. */

import type { Banner, BannerPlacement, Collection, LocaleCode, Menu, StaticPage } from "@/types/shop";
import { type Bilingual, img, publicImage, t } from "./shared";
import { fixtureProducts } from "./catalog";

/* -------------------------------------------------------------------------- */
/* Banners                                                                    */
/* -------------------------------------------------------------------------- */

interface RawBanner {
  id: string;
  placement: BannerPlacement;
  title: Bilingual;
  subtitle: Bilingual;
  cta: Bilingual;
  href: string;
  /**
   * Either a 1-based index into the portrait product fixtures, or a path under
   * `public/` — e.g. `"/hero/winter.jpg"` — for a real landscape banner.
   */
  image: number | string;
  /** Optional portrait crop for the 4/5 mobile hero. Falls back to `image`. */
  mobileImage?: string;
  theme: "light" | "dark";
}

const RAW_BANNERS: RawBanner[] = [
  {
    id: "hero-1",
    placement: "home_hero",
    title: t("تشكيلة الشتاء", "The Winter Edit"),
    subtitle: t("أقمشة أثقل، قصّات تحفظ شكلها", "Heavier cloth, lines that hold"),
    cta: t("تسوق التشكيلة", "Shop the edit"),
    href: "/c/thobes-winter",
    image: 1,
    theme: "dark",
  },
  {
    id: "hero-2",
    placement: "home_hero",
    title: t("الثوب السعودي", "The Saudi Thobe"),
    subtitle: t("مفصّل بعناية من قطن مصري", "Tailored from Egyptian cotton"),
    cta: t("اكتشف الآن", "Discover"),
    href: "/c/thobes-saudi",
    image: 3,
    theme: "dark",
  },
  {
    id: "hero-3",
    placement: "home_hero",
    title: t("بشوت المناسبات", "Bisht for Occasions"),
    subtitle: t("حاشية ذهبية منسوجة يدويًا", "Hand-woven gold trim"),
    cta: t("تسوق البشوت", "Shop bisht"),
    href: "/c/bisht",
    image: 5,
    theme: "dark",
  },
];

export function fixtureBanners(placement: BannerPlacement, locale: LocaleCode): Banner[] {
  return RAW_BANNERS.filter((raw) => raw.placement === placement).map((raw, index) => {
    const alt = raw.title[locale];
    const desktop =
      typeof raw.image === "string" ? publicImage(raw.image, alt) : img(raw.image, alt);

    return {
      id: raw.id,
      placement: raw.placement,
      title: alt,
      subtitle: raw.subtitle[locale],
      cta_label: raw.cta[locale],
      cta_href: raw.href,
      desktop_image: desktop,
      mobile_image: raw.mobileImage
        ? publicImage(raw.mobileImage, alt, 1080, 1350)
        : desktop,
      text_theme: raw.theme,
      sort_order: index,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Collections                                                                */
/* -------------------------------------------------------------------------- */

const COLLECTION_TITLES: Record<string, { title: Bilingual; subtitle: Bilingual }> = {
  best_sellers: {
    title: t("الأكثر مبيعًا", "Best Sellers"),
    subtitle: t("ما يختاره عملاؤنا أكثر من غيره", "What our customers reach for most"),
  },
  new_arrivals: {
    title: t("وصل حديثًا", "New Arrivals"),
    subtitle: t("أحدث القطع في المتجر", "The newest pieces in store"),
  },
  offers: {
    title: t("العروض", "Offers"),
    subtitle: t("أسعار مميزة لفترة محدودة", "Special prices for a limited time"),
  },
};

export function fixtureCollection(code: string, locale: LocaleCode): Collection {
  const meta = COLLECTION_TITLES[code];
  const all = fixtureProducts(locale);

  // Deterministic but distinct slices, so the two homepage rails don't show
  // an identical set of products.
  const products = code === "new_arrivals"
    ? all.slice(4, 12)
    : code === "offers"
      ? all.filter((product) => product.compare_at_price !== null).slice(0, 8)
      : all.slice(0, 8);

  return {
    id: code,
    code,
    title: meta ? meta.title[locale] : code,
    subtitle: meta ? meta.subtitle[locale] : null,
    // Its own listing page, matching the API. Pointing every collection at a
    // category sent "view all best sellers" to a category listing instead.
    href: `/collections/${code}`,
    products,
  };
}

/* -------------------------------------------------------------------------- */
/* Menus                                                                      */
/* -------------------------------------------------------------------------- */

const RAW_MENUS: Record<string, { title: Bilingual; items: { label: Bilingual; href: string }[] }> = {
  footer_company: {
    title: t("الشركة", "Company"),
    items: [
      { label: t("من نحن", "About us"), href: "/pages/about" },
      { label: t("فروعنا", "Our stores"), href: "/stores" },
      { label: t("الوظائف", "Careers"), href: "/pages/careers" },
      { label: t("تواصل معنا", "Contact us"), href: "/pages/contact" },
    ],
  },
  footer_info: {
    title: t("معلومات", "Information"),
    items: [
      { label: t("الشحن والتوصيل", "Shipping & delivery"), href: "/pages/shipping" },
      { label: t("الاستبدال والإرجاع", "Returns & exchanges"), href: "/pages/returns" },
      { label: t("طرق الدفع", "Payment methods"), href: "/pages/payment" },
      { label: t("دليل المقاسات", "Size guide"), href: "/pages/size-guide" },
    ],
  },
  footer_support: {
    title: t("الدعم", "Support"),
    items: [
      { label: t("الأسئلة الشائعة", "FAQ"), href: "/pages/faq" },
      { label: t("تتبع طلبك", "Track your order"), href: "/account/orders" },
      { label: t("الشروط والأحكام", "Terms & conditions"), href: "/pages/terms" },
      { label: t("سياسة الخصوصية", "Privacy policy"), href: "/pages/privacy" },
    ],
  },
};

export function fixtureMenu(code: string, locale: LocaleCode): Menu {
  const raw = RAW_MENUS[code];
  if (!raw) return { code, title: code, items: [] };

  return {
    code,
    title: raw.title[locale],
    items: raw.items.map((item, index) => ({
      id: `${code}-${index}`,
      label: item.label[locale],
      href: item.href,
      children: [],
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Static pages                                                               */
/* -------------------------------------------------------------------------- */

const PAGE_BODIES: Record<string, { title: Bilingual; body: Bilingual }> = {
  about: {
    title: t("من نحن", "About us"),
    body: t(
      "<p>بدأت GR8 من فكرة بسيطة: أن الثوب السعودي يستحق خامة أفضل وقصّة أدق. نعمل مع مصانع مختارة داخل المملكة وخارجها، ونراجع كل دفعة قبل وصولها إلى المتجر.</p><h2>حرفية</h2><p>تُنفّذ تفاصيل الياقة والأكمام يدويًا، وهي التفاصيل التي تُظهر الفرق بعد عشرات الغسلات.</p><h2>فروعنا</h2><p>لدينا فروع في الرياض وجدة والدمام، ويمكن استلام الطلبات أو إرجاعها من أي فرع.</p>",
      "<p>GR8 started from a simple idea: that the Saudi thobe deserves better cloth and a more careful line. We work with selected makers inside and outside the Kingdom, and review every batch before it reaches the shop floor.</p><h2>Craft</h2><p>Collar and cuff detailing is finished by hand — the details that still show after fifty washes.</p><h2>Our stores</h2><p>We have branches in Riyadh, Jeddah and Dammam. Orders can be collected or returned at any of them.</p>",
    ),
  },
  shipping: {
    title: t("الشحن والتوصيل", "Shipping & delivery"),
    body: t(
      "<p>نشحن إلى جميع مناطق المملكة العربية السعودية.</p><h2>المدة</h2><p>2–4 أيام عمل داخل المدن الرئيسية، و3–6 أيام لبقية المناطق.</p><h2>التكلفة</h2><p>الشحن مجاني للطلبات التي تتجاوز 200 دينار. ما دون ذلك، تُحتسب رسوم ثابتة قدرها 25 دينارًا.</p><h2>التتبع</h2><p>يصلك رقم التتبع عبر رسالة نصية فور خروج الشحنة من المستودع.</p>",
      "<p>We ship to every region of Saudi Arabia.</p><h2>Timing</h2><p>2–4 working days to major cities, 3–6 days elsewhere.</p><h2>Cost</h2><p>Shipping is free on orders over 200 KWD. Below that, a flat 25 KWD applies.</p><h2>Tracking</h2><p>A tracking number is sent by SMS as soon as the parcel leaves our warehouse.</p>",
    ),
  },
  returns: {
    title: t("الاستبدال والإرجاع", "Returns & exchanges"),
    body: t(
      "<p>يمكنك إرجاع أي قطعة خلال 14 يومًا من الاستلام.</p><h2>الشروط</h2><p>يجب أن تكون القطعة بحالتها الأصلية، غير مستعملة، مع بطاقاتها.</p><h2>كيف ترجع</h2><p>عبر أي فرع يقبل الإرجاع، أو بطلب استلام مجاني من خلال حسابك.</p><h2>المبالغ المستردة</h2><p>تُعاد المبالغ إلى وسيلة الدفع الأصلية خلال 5–10 أيام عمل.</p>",
      "<p>Any item can be returned within 14 days of delivery.</p><h2>Conditions</h2><p>The item must be unworn and in its original condition with tags attached.</p><h2>How to return</h2><p>At any branch that accepts returns, or by arranging a free pickup from your account.</p><h2>Refunds</h2><p>Refunds go back to the original payment method within 5–10 working days.</p>",
    ),
  },
  payment: {
    title: t("طرق الدفع", "Payment methods"),
    body: t(
      "<p>نقبل مدى، فيزا، ماستركارد، Apple Pay، وتمارا للتقسيط.</p><h2>الأمان</h2><p>تتم جميع المدفوعات عبر بوابة مشفّرة، ولا نحتفظ ببيانات بطاقتك على خوادمنا.</p><h2>الأسعار</h2><p>جميع الأسعار المعروضة شاملة ضريبة القيمة المضافة 15%.</p>",
      "<p>We accept mada, Visa, Mastercard, Apple Pay, and Tamara for instalments.</p><h2>Security</h2><p>All payments run through an encrypted gateway. We never store card details on our servers.</p><h2>Prices</h2><p>Every price shown includes 15% VAT.</p>",
    ),
  },
  privacy: {
    title: t("سياسة الخصوصية", "Privacy policy"),
    body: t(
      "<p>نجمع الحد الأدنى من البيانات اللازمة لتنفيذ طلبك.</p><h2>ما نجمعه</h2><p>الاسم، رقم الهاتف، البريد الإلكتروني، وعنوان الشحن.</p><h2>ما لا نفعله</h2><p>لا نبيع بياناتك ولا نشاركها مع أطراف ثالثة لأغراض تسويقية.</p><h2>حقوقك</h2><p>يمكنك طلب نسخة من بياناتك أو حذف حسابك في أي وقت.</p>",
      "<p>We collect the minimum data needed to fulfil your order.</p><h2>What we collect</h2><p>Name, phone number, email address, and shipping address.</p><h2>What we don't do</h2><p>We do not sell your data or share it with third parties for marketing.</p><h2>Your rights</h2><p>You can request a copy of your data or delete your account at any time.</p>",
    ),
  },
  terms: {
    title: t("الشروط والأحكام", "Terms & conditions"),
    body: t(
      "<p>باستخدامك لهذا الموقع فإنك توافق على الشروط التالية.</p><h2>الطلبات</h2><p>يخضع كل طلب لتوفر المخزون. في حال نفاد قطعة بعد الطلب، نتواصل معك ونرد المبلغ كاملًا.</p><h2>الأسعار</h2><p>نحتفظ بحق تعديل الأسعار دون إشعار مسبق، على ألا يؤثر ذلك على الطلبات المؤكدة.</p>",
      "<p>By using this site you agree to the following terms.</p><h2>Orders</h2><p>Every order is subject to stock availability. If an item sells out after you order, we contact you and refund in full.</p><h2>Prices</h2><p>We may change prices without notice, though this never affects orders already confirmed.</p>",
    ),
  },
  faq: {
    title: t("الأسئلة الشائعة", "FAQ"),
    body: t(
      "<h2>كيف أختار مقاسي؟</h2><p>يُقاس الثوب بالطول من الكتف إلى أسفل. راجع دليل المقاسات لجدول تفصيلي.</p><h2>هل يمكنني التعديل على الطلب بعد إرساله؟</h2><p>نعم، خلال ساعتين من تأكيد الطلب عبر التواصل مع خدمة العملاء.</p><h2>هل تشحنون خارج المملكة؟</h2><p>ليس حاليًا.</p>",
      "<h2>How do I choose my size?</h2><p>Thobes are measured by length from shoulder to hem. See the size guide for a full table.</p><h2>Can I change my order after placing it?</h2><p>Yes, within two hours of confirmation by contacting customer service.</p><h2>Do you ship outside Saudi Arabia?</h2><p>Not at present.</p>",
    ),
  },
  careers: {
    title: t("الوظائف", "Careers"),
    body: t(
      "<p>نبحث دائمًا عن زملاء يهتمون بالتفاصيل.</p><h2>الفروع</h2><p>وظائف البيع متاحة في الرياض وجدة والدمام.</p><h2>التقديم</h2><p>أرسل سيرتك الذاتية إلى careers@grc.example.</p>",
      "<p>We are always looking for colleagues who care about detail.</p><h2>Stores</h2><p>Sales roles are open in Riyadh, Jeddah and Dammam.</p><h2>Applying</h2><p>Send your CV to careers@grc.example.</p>",
    ),
  },
  contact: {
    title: t("تواصل معنا", "Contact us"),
    body: t(
      "<p>خدمة العملاء متاحة من الأحد إلى الخميس، 9 صباحًا حتى 6 مساءً.</p><h2>الهاتف</h2><p>920000000</p><h2>البريد الإلكتروني</h2><p>support@grc.example</p>",
      "<p>Customer service is available Sunday to Thursday, 9am to 6pm.</p><h2>Phone</h2><p>920000000</p><h2>Email</h2><p>support@grc.example</p>",
    ),
  },
  "size-guide": {
    title: t("دليل المقاسات", "Size guide"),
    body: t(
      "<p>تُقاس الثياب بالطول بالسنتيمتر من أعلى الكتف إلى أسفل الثوب.</p><h2>الجدول</h2><p>52 = 140 سم · 54 = 145 سم · 56 = 150 سم · 58 = 155 سم · 60 = 160 سم · 62 = 165 سم · 64 = 170 سم</p><h2>نصيحة</h2><p>إذا كان قياسك بين مقاسين، اختر الأكبر.</p>",
      "<p>Thobes are measured in centimetres from the top of the shoulder to the hem.</p><h2>Table</h2><p>52 = 140cm · 54 = 145cm · 56 = 150cm · 58 = 155cm · 60 = 160cm · 62 = 165cm · 64 = 170cm</p><h2>Tip</h2><p>If you fall between two sizes, take the larger.</p>",
    ),
  },
};

export function fixturePage(slug: string, locale: LocaleCode): StaticPage | null {
  const raw = PAGE_BODIES[slug];
  if (!raw) return null;

  return {
    slug,
    title: raw.title[locale],
    body_html: raw.body[locale],
    updated_at: "2026-06-01T00:00:00Z",
    seo: {
      title: raw.title[locale],
      description: raw.title[locale],
      canonical_path: `/pages/${slug}`,
      alternates: { ar: `/ar/pages/${slug}`, en: `/en/pages/${slug}` },
      json_ld: null,
    },
  };
}

export function fixturePageSlugs(): string[] {
  return Object.keys(PAGE_BODIES);
}
