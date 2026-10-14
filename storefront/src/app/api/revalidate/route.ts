import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { SHOP_CACHE_TAG } from "@/lib/shop-api";

/**
 * Called by the API (never by a browser) after an admin write or a placed
 * order, so cached catalogue reads are dropped and the next visitor sees the
 * change. Guarded by a shared secret; without one configured it does nothing.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || request.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ code: "forbidden", message: "Forbidden", details: null }, { status: 403 });
  }
  revalidateTag(SHOP_CACHE_TAG);
  return NextResponse.json({ revalidated: true });
}
