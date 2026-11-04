import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getAllSlugs } from "@/lib/events";
import { alternatesFor } from "@/lib/seo";

const STATIC_ROUTES = ["/", "/evenimente", "/despre-noi", "/implica-te", "/confidentialitate"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const hrefs = [
    ...STATIC_ROUTES,
    ...getAllSlugs().map((slug) => ({ pathname: "/evenimente/[slug]" as const, params: { slug } }))
  ];
  // One entry per page and locale, each listing its translations (hreflang).
  return routing.locales.flatMap((locale) =>
    hrefs.map((href) => {
      const { canonical, languages } = alternatesFor(locale, href);
      return { url: canonical, alternates: { languages } };
    })
  );
}
