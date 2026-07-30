import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/lib/events";
import { siteConfig } from "@/site.config";

type Href = Parameters<typeof getPathname>[0]["href"];

/**
 * Canonical URL for `href` in `locale`, plus hreflang alternates for both
 * locales; x-default points to Romanian.
 */
export function alternatesFor(locale: Locale, href: Href) {
  const ro = getPathname({ locale: "ro", href });
  const en = getPathname({ locale: "en", href });
  return {
    canonical: `${siteConfig.url}${getPathname({ locale, href })}`,
    languages: {
      ro: `${siteConfig.url}${ro}`,
      en: `${siteConfig.url}${en}`,
      "x-default": `${siteConfig.url}${ro}`
    }
  };
}
