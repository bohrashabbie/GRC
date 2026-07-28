import "server-only";

import { redirect } from "next/navigation";

import { currentCustomer } from "@/app/actions";
import type { Customer, LocaleCode } from "@/types/shop";

/**
 * Guard for a page that only makes sense signed in.
 *
 * Deliberately per-page rather than in `account/layout.tsx`: the sign-in and
 * register routes nest inside that layout — their own layout strips the visual
 * chrome but does not escape the parent — so a redirect there sent
 * /account/login to /account/login and looped until Next.js gave up, leaving a
 * blank page where the sign-in form should be.
 */
export async function requireCustomer(locale: LocaleCode): Promise<Customer> {
  const customer = await currentCustomer(locale);
  if (!customer) redirect(`/${locale}/account/login`);
  return customer;
}
