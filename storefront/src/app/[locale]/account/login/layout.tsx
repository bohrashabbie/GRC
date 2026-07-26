import type { ReactNode } from "react";

/**
 * Opts the auth pages out of the account chrome. A nested layout under
 * `/account` would otherwise wrap the sign-in form in a sidebar of links the
 * visitor cannot use yet.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
