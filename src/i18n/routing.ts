import { defineRouting } from "next-intl/routing";

/**
 * Locale cookie used by the middleware for locale detection. Declared
 * explicitly (these are next-intl's defaults) so that `LocaleSwitcher` can keep
 * it in sync on client-side navigations.
 */
export const LOCALE_COOKIE = { name: "NEXT_LOCALE", sameSite: "lax", path: "/" } as const;

export const routing = defineRouting({
  locales: ["ro", "en"],
  defaultLocale: "ro",
  localePrefix: "as-needed",
  // Always serve Romanian at "/" — never auto-redirect based on the
  // browser's Accept-Language header or a previously stored cookie.
  localeDetection: false,
  localeCookie: LOCALE_COOKIE,
  pathnames: {
    "/": "/",
    "/evenimente": { ro: "/evenimente", en: "/events" },
    "/evenimente/[slug]": { ro: "/evenimente/[slug]", en: "/events/[slug]" },
    "/despre-noi": { ro: "/despre-noi", en: "/about" },
    "/implica-te": { ro: "/implica-te", en: "/get-involved" }
  }
});
