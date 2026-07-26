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

export function SnapchatIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5c2.5 0 4.2 1.9 4.2 4.3 0 .9-.1 1.8-.1 2.2.4.2.9.2 1.4 0 .6-.2 1.1.6.5 1.1-.5.4-1.4.7-1.7 1.1-.3.5.9 2.7 3 3.4.5.2.4.8-.2 1-.6.2-1.5.2-1.8.6-.2.3-.1.9-.6 1-.6.1-1.6-.4-2.7-.1-1 .3-1.6 1.4-3 1.4s-2-1.1-3-1.4c-1.1-.3-2.1.2-2.7.1-.5-.1-.4-.7-.6-1-.3-.4-1.2-.4-1.8-.6-.6-.2-.7-.8-.2-1 2.1-.7 3.3-2.9 3-3.4-.3-.4-1.2-.7-1.7-1.1-.6-.5-.1-1.3.5-1.1.5.2 1 .2 1.4 0 0-.4-.1-1.3-.1-2.2 0-2.4 1.7-4.3 4.2-4.3Z" />
    </Icon>
  );
}
