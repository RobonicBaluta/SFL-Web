import { getPathname } from "@/i18n/navigation";
import { siteConfig } from "@/site.config";

type Href = Parameters<typeof getPathname>[0]["href"];

/** hreflang alternates for a route in both locales; x-default points to Romanian. */
export function alternatesFor(href: Href) {
  const ro = getPathname({ locale: "ro", href });
  const en = getPathname({ locale: "en", href });
  return {
    languages: {
      ro: `${siteConfig.url}${ro}`,
      en: `${siteConfig.url}${en}`,
      "x-default": `${siteConfig.url}${ro}`
    }
  };
}
