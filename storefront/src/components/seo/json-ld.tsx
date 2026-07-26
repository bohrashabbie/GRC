/**
 * Injects a JSON-LD block.
 *
 * The payload is built server-side from data we already fetched, never from
 * user input, so `dangerouslySetInnerHTML` is safe here — but `<` is still
 * escaped so a stray sequence in a product name can't terminate the script
 * element early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
