/**
 * http.ts — small shared helpers for the HTTP layer.
 */

/** Matches a canonical UUID (any version). */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Read a string cookie value out of Elysia's cookie store.
 * Returns undefined when the cookie is missing or not a string.
 */
export function cookieVal(
  cookie: Record<string, { value: unknown } | undefined>,
  name: string,
): string | undefined {
  const v = cookie[name]?.value;
  return typeof v === 'string' ? v : undefined;
}
