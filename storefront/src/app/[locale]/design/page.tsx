import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";
import { ProductCard } from "@/components/product/product-card";
import { Price } from "@/components/product/price";
import { fixtureProducts } from "@/mocks/fixtures";
import type { Locale } from "@/i18n/routing";

/**
 * Internal design specimen — not part of the storefront's public surface.
 * Labels are intentionally English-only in both locales: this page is a tool
 * for us, while the *specimens* on it show real AR and EN content so the type
 * can be judged in the direction it will actually be read.
 *
 * Delete before launch, or leave it behind a non-production guard.
 */

export const metadata: Metadata = {
  title: "Design direction",
  robots: { index: false, follow: false },
};

const PALETTE: { name: string; token: string; hex: string; note: string }[][] = [
  [
    { name: "sand-50", token: "bg-sand-50", hex: "#FBF9F5", note: "Page ground" },
    { name: "sand-100", token: "bg-sand-100", hex: "#F5F0E7", note: "Image wells, bands" },
    { name: "sand-200", token: "bg-sand-200", hex: "#EBE3D6", note: "Hairlines" },
    { name: "sand-300", token: "bg-sand-300", hex: "#DACFBD", note: "Strong hairlines, inputs" },
    { name: "sand-400", token: "bg-sand-400", hex: "#C0B29B", note: "Disabled edges" },
  ],
  [
    { name: "ink-400", token: "bg-ink-400", hex: "#8A7F71", note: "3.4:1 — large text only" },
    { name: "ink-500", token: "bg-ink-500", hex: "#6B6155", note: "5.4:1 — secondary text" },
    { name: "ink-600", token: "bg-ink-600", hex: "#4E463C", note: "Body on tinted grounds" },
    { name: "ink-700", token: "bg-ink-700", hex: "#3A342C", note: "Nav links" },
    { name: "ink-900", token: "bg-ink-900", hex: "#16130F", note: "17:1 — headings, footer" },
  ],
  [
    { name: "palm-500", token: "bg-palm-500", hex: "#35634F", note: "Hover lift" },
    { name: "palm-600", token: "bg-palm-600", hex: "#27503F", note: "Primary CTA — 10:1" },
    { name: "palm-700", token: "bg-palm-700", hex: "#1C3B2E", note: "CTA hover" },
    { name: "palm-800", token: "bg-palm-800", hex: "#132A21", note: "CTA active" },
  ],
  [
    { name: "gold-300", token: "bg-gold-300", hex: "#E2C88F", note: "Selection, hover fill" },
    { name: "gold-400", token: "bg-gold-400", hex: "#D4AF6A", note: "Fill under ink text" },
    { name: "gold-500", token: "bg-gold-500", hex: "#B8873F", note: "2.9:1 — NON-TEXT only" },
    { name: "gold-700", token: "bg-gold-700", hex: "#8A6428", note: "5.0:1 — gold as text" },
  ],
  [
    { name: "brick-500", token: "bg-brick-500", hex: "#B04A3A", note: "Hover" },
    { name: "brick-600", token: "bg-brick-600", hex: "#96382B", note: "7.8:1 — sale price" },
  ],
];

const TYPE_SPECIMENS: { label: string; className: string; ar: string; en: string }[] = [
  {
    label: "display-1 · clamp(2.5rem → 4.5rem) · display face",
    className: "font-display text-display-1",
    ar: "أناقة الثوب السعودي",
    en: "The Saudi Thobe",
  },
  {
    label: "display-2 · clamp(2rem → 3.25rem) · display face",
    className: "font-display text-display-2",
    ar: "تشكيلة الشتاء",
    en: "The Winter Edit",
  },
  {
    label: "h1 · clamp(1.75rem → 2.5rem) · display face",
    className: "font-display text-h1",
    ar: "الأكثر مبيعًا هذا الموسم",
    en: "Best sellers this season",
  },
  {
    label: "h2 · clamp(1.375rem → 1.875rem) · display face",
    className: "font-display text-h2",
    ar: "وصل حديثًا",
    en: "New arrivals",
  },
  {
    label: "lg · 1.0625rem · body face — intro paragraphs",
    className: "text-lg text-ink-600",
    ar: "ثوب مفصّل بعناية من قماش يتنفس، مصمّم ليبقى أنيقًا طوال اليوم.",
    en: "Cut from a breathable poplin and finished by hand, made to hold its line all day.",
  },
  {
    label: "base · 1rem (1.0625rem in Arabic) · body face — body copy",
    className: "text-base text-ink-600",
    ar: "متوفر بمقاسات من 52 إلى 64، مع خيار تفصيل الأكمام حسب الطلب.",
    en: "Available in sizes 52 to 64, with an optional made-to-measure sleeve.",
  },
  {
    label: "sm · 0.875rem · body face — product names, labels",
    className: "text-sm text-ink-800",
    ar: "ثوب سعودي كلاسيكي — عاجي",
    en: "Classic Saudi Thobe — Ivory",
  },
  {
    label: "2xs · 0.6875rem · body face — meta, counts, legal",
    className: "text-2xs text-ink-400",
    ar: "شامل ضريبة القيمة المضافة",
    en: "VAT included",
  },
];

function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-hairline py-12">
      <h2 className="font-display text-h2 text-ink-900">{title}</h2>
      {intro && <p className="mt-2 max-w-2xl text-sm text-ink-500">{intro}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

export default async function DesignPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const products = fixtureProducts(typedLocale);

  return (
    <div className="container-site py-14">
      <header className="pb-10">
        <p className="eyebrow">Design direction</p>
        <h1 className="mt-3 font-display text-display-2 text-ink-900">GR8 storefront</h1>
        <p className="mt-4 max-w-2xl text-base text-ink-500">
          Switch the locale in the top bar to see this page flip direction and swap display
          typeface. Both readings are part of the review — a decision that only works in one
          direction is not finished.
        </p>
      </header>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Colour"
        intro="Built from the material vocabulary of the category: undyed cotton (sand), oud-dark wood (ink), palm shade (palm), gold thread on a bisht hem (gold), and the desaturated red of a shemagh (brick). Contrast ratios are measured against sand-50."
      >
        <div className="space-y-8">
          {PALETTE.map((ramp) => (
            <div key={ramp[0].name} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {ramp.map((swatch) => (
                <div key={swatch.name} className="border border-hairline">
                  <div className={`h-20 ${swatch.token}`} />
                  <div className="space-y-0.5 p-3">
                    <p className="text-xs font-semibold text-ink-900">{swatch.name}</p>
                    <p className="tabular text-2xs text-ink-400">{swatch.hex}</p>
                    <p className="text-2xs text-ink-500">{swatch.note}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-8 border-s-2 border-gold-500 bg-sand-100 p-5">
          <p className="text-sm text-ink-700">
            <strong className="font-semibold">The one rule about gold.</strong> gold-500 is
            2.9:1 on sand — below the 4.5:1 floor. It is a rule, ring, badge edge and icon
            colour, never body text. When gold has to carry words, it is gold-700 (5.0:1), or
            it becomes a gold-400 fill with ink-900 text on top (8.9:1).
          </p>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Typography"
        intro="IBM Plex Sans Arabic carries body copy in both scripts. Headlines switch face by locale — Reem Kufi for Arabic, Cormorant Garamond for Latin — because one family stretched across both scripts always shortchanges one of them."
      >
        <dl className="divide-y divide-hairline border-y border-hairline">
          {TYPE_SPECIMENS.map((specimen) => (
            <div key={specimen.label} className="grid gap-3 py-6 lg:grid-cols-[16rem_1fr] lg:gap-8">
              <dt className="tabular pt-1 text-2xs text-ink-400">{specimen.label}</dt>
              <dd className="space-y-3">
                <p className={specimen.className} dir="rtl" lang="ar">
                  {specimen.ar}
                </p>
                <p className={specimen.className} dir="ltr" lang="en">
                  {specimen.en}
                </p>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="border border-hairline p-5">
            <p className="eyebrow">Eyebrow / section kicker</p>
            <p className="mt-3 text-sm text-ink-500">
              Uppercase and 0.14em tracking is a Latin device. Arabic has no case, and
              letter-spacing severs its cursive joins outright — so the Arabic eyebrow drops
              both and gets size and colour instead. Toggle the locale to see it change.
            </p>
          </div>
          <div className="border border-hairline p-5">
            {/* Space-separated digits are individual bidi runs, so without an
                LTR isolate this specimen renders back-to-front in Arabic. */}
            <p dir="ltr" className="tabular text-sm text-ink-900">
              1 2 3 4 5 6 7 8 9 0 · 349.00 · 52–64
            </p>
            <p className="mt-3 text-sm text-ink-500">
              Numerals are pinned to Western digits in both locales via{" "}
              <code className="text-2xs text-gold-700">ar-SA-u-nu-latn</code>. Saudi ecommerce
              shows prices, sizes and order numbers this way essentially without exception.
            </p>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Spacing, corners, elevation"
        intro="A 4px base with an editorial rhythm on top. Corners stay near-square — rounded corners read as software, not tailoring — and hairlines do the work shadows would normally do."
      >
        <div className="grid gap-8 lg:grid-cols-3">
          <div>
            <p className="eyebrow">Corner radius</p>
            <div className="mt-4 flex items-end gap-4">
              {[
                { label: "none", cls: "rounded-none" },
                { label: "xs · 2px", cls: "rounded-xs" },
                { label: "sm · 3px", cls: "rounded-sm" },
                { label: "full", cls: "rounded-full" },
              ].map((radius) => (
                <div key={radius.label} className="text-center">
                  <div className={`size-14 bg-sand-200 ${radius.cls}`} />
                  <p className="mt-2 text-2xs text-ink-400">{radius.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="eyebrow">Elevation</p>
            <div className="mt-4 flex items-end gap-4">
              <div className="text-center">
                <div className="size-14 border border-hairline bg-surface" />
                <p className="mt-2 text-2xs text-ink-400">hairline</p>
              </div>
              <div className="text-center">
                <div className="size-14 bg-surface shadow-raised" />
                <p className="mt-2 text-2xs text-ink-400">raised</p>
              </div>
              <div className="text-center">
                <div className="size-14 bg-surface shadow-overlay" />
                <p className="mt-2 text-2xs text-ink-400">overlay</p>
              </div>
            </div>
          </div>

          <div>
            <p className="eyebrow">Section rhythm</p>
            <p className="mt-4 tabular text-sm text-ink-500">
              container 1440 · gutter 20/40
              <br />
              section-y clamp(48px → 96px)
              <br />
              grid gap 12 mobile / 24 desktop
            </p>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section title="Buttons" intro="Palm carries every primary action. Gold is a fill, never a label colour.">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" size="lg">
            {locale === "ar" ? "أضف إلى السلة" : "Add to cart"}
          </Button>
          <Button variant="secondary">{locale === "ar" ? "تسوق الآن" : "Shop now"}</Button>
          <Button variant="gold">{locale === "ar" ? "اشترِ الآن" : "Buy now"}</Button>
          <Button variant="ghost">{locale === "ar" ? "عرض المزيد" : "Load more"}</Button>
          <Button variant="primary" disabled>
            {locale === "ar" ? "نفدت الكمية" : "Sold out"}
          </Button>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Price"
        intro="Every figure is a server-supplied decimal string. The only thing computed in the browser is the discount percentage on the badge, which is a label — no total, tax or threshold is ever derived client-side."
      >
        <div className="flex flex-wrap items-end gap-10">
          <div>
            <p className="eyebrow">Regular</p>
            <Price price="349.00" size="lg" className="mt-3" />
          </div>
          <div>
            <p className="eyebrow">On sale</p>
            <Price price="349.00" compareAtPrice="449.00" size="lg" className="mt-3" />
          </div>
          <div>
            <p className="eyebrow">Card size</p>
            <Price price="289.00" compareAtPrice="380.00" size="sm" className="mt-3" />
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Product card"
        intro="Image wells are sand-100, not white: the catalogue is mostly ivory garments on a pale backdrop, and on a white card the product edge disappears. Hover swaps to the second shot. The four states below are in stock, low stock, limited, and sold out."
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="The mark"
        intro="A Rub el Hizb drawn as a hairline rather than a solid — the single piece of ornament in the identity, legible at 20px and at 200."
      >
        <div className="flex flex-wrap items-center gap-10 bg-sand-100 p-10">
          <LogoMark className="size-8 text-gold-500" />
          <LogoMark className="size-16 text-gold-500" />
          <LogoMark className="size-32 text-ink-900" />
        </div>
      </Section>
    </div>
  );
}
