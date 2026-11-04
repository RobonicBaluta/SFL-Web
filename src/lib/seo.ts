import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/lib/events";
import { siteConfig } from "@/site.config";

type Href = Parameters<typeof getPathname>[0]["href"];

export const DEFAULT_SHARE_IMAGE = "/images/sfl-flag.jpg";

const OG_LOCALE: Record<Locale, string> = { ro: "ro_RO", en: "en_US" };

/** `path` (a site path such as "/events/x/a b.jpg") as an absolute, encoded URL. */
export function absoluteUrl(path: string): string {
  return `${siteConfig.url}${encodeURI(path)}`;
}

/** Absolute URL of `href` in `locale`. */
export function canonicalUrl(locale: Locale, href: Href): string {
  return `${siteConfig.url}${getPathname({ locale, href })}`;
}

/**
 * Canonical URL for `href` in `locale`, plus hreflang alternates for both
 * locales; x-default points to Romanian.
 */
export function alternatesFor(locale: Locale, href: Href) {
  return {
    canonical: canonicalUrl(locale, href),
    languages: {
      ro: canonicalUrl("ro", href),
      en: canonicalUrl("en", href),
      "x-default": canonicalUrl("ro", href)
    }
  };
}

/**
 * Share-preview URL for a site image, resized to 1200px wide by the Next.js
 * image optimizer. Event originals can be several MB, and WhatsApp drops the
 * preview for images that large.
 */
export function shareImageUrl(path: string): string {
  return `${siteConfig.url}/_next/image?url=${encodeURIComponent(path)}&w=1200&q=75`;
}

/**
 * Open Graph tags for a page. A page that sets `openGraph` replaces the
 * layout's object instead of merging into it, so every page builds the full set.
 * Title and description are filled in by Next.js from the page's own.
 */
export function openGraphFor(locale: Locale, href: Href | null, image = DEFAULT_SHARE_IMAGE) {
  return {
    type: "website" as const,
    siteName: siteConfig.name,
    locale: OG_LOCALE[locale],
    alternateLocale: OG_LOCALE[locale === "ro" ? "en" : "ro"],
    ...(href !== null && { url: canonicalUrl(locale, href) }),
    images: [shareImageUrl(image)]
  };
}

/** Metadata shared by every public page: description, canonical, hreflang, Open Graph. */
export function pageMetadata(
  locale: Locale,
  href: Href,
  { title, description, image }: { title?: string; description: string; image?: string }
) {
  return {
    ...(title !== undefined && { title }),
    description,
    alternates: alternatesFor(locale, href),
    openGraph: openGraphFor(locale, href, image)
  };
}
