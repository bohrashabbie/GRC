import type { SVGProps } from "react";

/**
 * A small hand-drawn icon set rather than a dependency.
 *
 * The storefront leans on hairlines instead of shadows, so every icon is drawn
 * at a 1.25 stroke to sit at the same optical weight as a `sand-300` rule.
 * Icon libraries ship at 2 and would read heavier than everything around them.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      width={20}
      height={20}
      {...props}
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Icon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Icon>
  );
}

export function HeartIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <Icon fill={filled ? "currentColor" : "none"} {...props}>
      <path d="M12 20.5S3.5 15.5 3.5 9.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.5 2.6c0 5.9-8.5 10.9-8.5 10.9Z" />
    </Icon>
  );
}

/** A shopping bag, not a cart — closer to how a garment retailer presents it. */
export function BagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 7.5h15l-1 12.5a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1L4.5 7.5Z" />
      <path d="M8.75 10V6.5a3.25 3.25 0 0 1 6.5 0V10" />
    </Icon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 9.5 6 6 6-6" />
    </Icon>
  );
}

/** Points "forward" in LTR. Pair with `flip-rtl` so it reverses under RTL. */
export function ChevronForwardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m9.5 6 6 6-6 6" />
    </Icon>
  );
}

export function TruckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 6.5h11v9h-11z" />
      <path d="M13.5 10h3.6l2.9 3v2.5h-6.5z" />
      <circle cx="7" cy="18" r="1.75" />
      <circle cx="16.5" cy="18" r="1.75" />
    </Icon>
  );
}

export function ReturnIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 11a8 8 0 1 1 2.3 5.7" />
      <path d="M3.5 5.5V11H9" />
    </Icon>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.25 19 6v6c0 4.3-3 7.4-7 8.75-4-1.35-7-4.45-7-8.75V6l7-2.75Z" />
      <path d="m9 12 2.25 2.25L15.5 10" />
    </Icon>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z" />
    </Icon>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.2 2.4 3.3 5.3 3.3 8.5s-1.1 6.1-3.3 8.5c-2.2-2.4-3.3-5.3-3.3-8.5S9.8 5.9 12 3.5Z" />
    </Icon>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.75" y="3.75" width="16.5" height="16.5" rx="4.5" />
      <circle cx="12" cy="12" r="3.75" />
      <circle cx="16.9" cy="7.1" r=".9" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function XIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 4h3.6l5 6.6L17.9 4H20l-6.4 7.7L20.4 20h-3.6l-5.3-7L5.6 20H3.5l6.8-8.2L4 4Z" />
    </Icon>
  );
}

export function YoutubeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.75" y="5.75" width="18.5" height="12.5" rx="3.5" />
      <path d="M10.25 9.5 15 12l-4.75 2.5Z" fill="currentColor" />
    </Icon>
  );
}

/**
 * Facebook and WhatsApp are the two networks customers actually contact us
 * through, so unlike the hand-drawn set above these use the official brand
 * glyphs (filled, per each brand's guidelines) rather than a stroke sketch.
 */
export function FacebookIcon(props: IconProps) {
  return (
    <Icon fill="currentColor" stroke="none" {...props}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </Icon>
  );
}

export function WhatsappIcon(props: IconProps) {
  return (
    <Icon fill="currentColor" stroke="none" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </Icon>
  );
}

export function SnapchatIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5c2.5 0 4.2 1.9 4.2 4.3 0 .9-.1 1.8-.1 2.2.4.2.9.2 1.4 0 .6-.2 1.1.6.5 1.1-.5.4-1.4.7-1.7 1.1-.3.5.9 2.7 3 3.4.5.2.4.8-.2 1-.6.2-1.5.2-1.8.6-.2.3-.1.9-.6 1-.6.1-1.6-.4-2.7-.1-1 .3-1.6 1.4-3 1.4s-2-1.1-3-1.4c-1.1-.3-2.1.2-2.7.1-.5-.1-.4-.7-.6-1-.3-.4-1.2-.4-1.8-.6-.6-.2-.7-.8-.2-1 2.1-.7 3.3-2.9 3-3.4-.3-.4-1.2-.7-1.7-1.1-.6-.5-.1-1.3.5-1.1.5.2 1 .2 1.4 0 0-.4-.1-1.3-.1-2.2 0-2.4 1.7-4.3 4.2-4.3Z" />
    </Icon>
  );
}

/**
 * Payment scheme marks for the footer's badge cards. Visa and Apple Pay are
 * the official single-path glyphs (via Simple Icons); the Mastercard
 * interlocking circles are drawn to the mark's real geometry. Brand colors are
 * hard-coded on purpose — these sit on white cards and never follow the theme.
 */
function PaymentMark({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

export function VisaLogo(props: IconProps) {
  return (
    <PaymentMark {...props}>
      <path
        fill="#1A1F71"
        d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z"
      />
    </PaymentMark>
  );
}

export function MastercardLogo(props: IconProps) {
  return (
    <PaymentMark {...props}>
      <circle cx="8.6" cy="12" r="6" fill="#EB001B" />
      <circle cx="15.4" cy="12" r="6" fill="#F79E1B" />
      <path d="M12 7.056a6 6 0 0 1 0 9.888 6 6 0 0 1 0-9.888Z" fill="#FF5F00" />
    </PaymentMark>
  );
}

export function ApplePayLogo(props: IconProps) {
  return (
    <PaymentMark {...props}>
      <path
        fill="#000"
        d="M6.86 8.53c-.3.016-.668.199-.88.456-.191.22-.36.58-.316.918.338.03.675-.169.888-.418.205-.258.345-.603.308-.955zm2.207.42v5.493h.852v-1.877h1.18c1.078 0 1.835-.739 1.835-1.812 0-1.07-.742-1.805-1.808-1.805zm.852.719h.982c.739 0 1.161.396 1.161 1.089 0 .692-.422 1.092-1.164 1.092h-.979zm-3.154.3c-.45.01-.83.28-1.05.28-.235 0-.593-.264-.981-.257a1.446 1.446 0 0 0-1.23.747c-.527.908-.139 2.255.374 2.995.249.366.549.769.944.754.373-.014.52-.242.973-.242.454 0 .586.242.98.235.41-.007.667-.366.915-.733.286-.417.403-.82.41-.841-.007-.008-.79-.308-.797-1.209-.008-.754.615-1.113.644-1.135-.352-.52-.9-.578-1.09-.593a1.123 1.123 0 0 0-.092-.002zm8.204.397c-.99 0-1.606.533-1.652 1.256h.777c.072-.358.369-.586.845-.586.502 0 .803.266.803.711v.309l-1.097.064c-.951.054-1.488.484-1.488 1.184 0 .72.548 1.207 1.332 1.207.526 0 1.032-.281 1.264-.727h.019v.659h.788v-2.76c0-.803-.62-1.317-1.591-1.317zm1.94.072l1.446 4.009c0 .003-.073.24-.073.247-.125.41-.33.571-.711.571-.069 0-.206 0-.267-.015v.666c.06.011.267.019.335.019.83 0 1.226-.312 1.568-1.283l1.5-4.214h-.868l-1.012 3.259h-.015l-1.013-3.26zm-1.167 2.189v.316c0 .521-.45.917-1.024.917-.442 0-.731-.228-.731-.579 0-.342.278-.56.769-.593z"
      />
    </PaymentMark>
  );
}
