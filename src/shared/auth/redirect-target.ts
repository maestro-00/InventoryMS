/**
 * `?redirect=` arrives from the browser and is replayed after sign-in, including into the
 * provider-hosted Google flow as `returnUrl`. Only same-document paths are honoured so a
 * crafted link cannot bounce a freshly authenticated user off-site.
 */
export function internalRedirectTarget(target: string | undefined): string | null {
  if (!target) return null;
  if (!target.startsWith("/")) return null;
  // "//host" and "/\host" are both read as protocol-relative URLs by browsers.
  if (target.startsWith("//") || target.startsWith("/\\")) return null;
  // Reject C0 controls, space, and DEL that can smuggle a second scheme or header.
  for (let i = 0; i < target.length; i += 1) {
    const code = target.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) return null;
  }
  return target;
}

export interface RedirectTarget {
  to: string;
  search: Record<string, string>;
}

/**
 * Splits a saved location into the parts the router navigates with. A stored target keeps
 * its query string, and the router only reads search params from a separate object.
 */
export function parseInternalRedirect(
  target: string | undefined,
): RedirectTarget | null {
  const safe = internalRedirectTarget(target);
  if (!safe) return null;
  const url = new URL(safe, "http://internal.invalid");
  return { to: url.pathname, search: Object.fromEntries(url.searchParams) };
}
