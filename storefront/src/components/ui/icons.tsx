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

export function TiktokIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.25 3.5c.4 2.4 1.9 3.9 4.25 4.1v2.6c-1.5.1-2.9-.3-4.2-1.1v5.6a5.1 5.1 0 1 1-4.4-5.05v2.7a2.45 2.45 0 1 0 1.75 2.35V3.5h2.6Z" />
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
