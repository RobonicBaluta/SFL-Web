import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getAllSlugs } from "@/lib/events";
import { siteConfig } from "@/site.config";

const STATIC_ROUTES = ["/", "/evenimente", "/despre-noi", "/implica-te"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of routing.locales) {
    for (const href of STATIC_ROUTES) {
      entries.push({ url: siteConfig.url + getPathname({ locale, href }) });
    }
    for (const slug of getAllSlugs()) {
      entries.push({
        url:
          siteConfig.url +
          getPathname({ locale, href: { pathname: "/evenimente/[slug]", params: { slug } } })
      });
    }
  }
  return entries;
}
