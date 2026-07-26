import type { ReactNode } from "react";

/** Same reasoning as the login layout — no account chrome before sign-in. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
