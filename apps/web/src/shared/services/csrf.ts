const DEFAULT_CSRF_COOKIE_NAME = "indobraga_csrf";

export function getCsrfCookieName(): string {
  return import.meta.env.VITE_CSRF_COOKIE_NAME || DEFAULT_CSRF_COOKIE_NAME;
}

/** Baca cookie non-httpOnly CSRF (double-submit, port legacy). */
export function getCsrfToken(cookieSource?: string): string | undefined {
  const source = cookieSource ?? (typeof document === "undefined" ? "" : document.cookie);
  const name = encodeURIComponent(getCsrfCookieName());
  for (const part of source.split(";")) {
    const [rawKey, ...rest] = part.split("=");
    if (rawKey.trim() === name) {
      const raw = rest.join("=").trim();
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return undefined;
}
