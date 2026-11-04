import type { Locale, SflEvent } from "@/lib/events";
import { absoluteUrl, canonicalUrl } from "@/lib/seo";
import { siteConfig } from "@/site.config";

// schema.org JSON-LD that lets search engines show the organization (name, logo,
// social profiles) and the events (date, place) in their results.
// Check changes with https://search.google.com/test/rich-results

const ORG_ID = `${siteConfig.url}/#organization`;
const SITE_ID = `${siteConfig.url}/#website`;

function socialProfiles(): string[] {
  return siteConfig.social.map((s) => s.url).filter((url) => url !== "");
}

/** Organization + WebSite, for the home page. */
export function homeJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: siteConfig.name,
        alternateName: [...siteConfig.alternateNames],
        url: `${siteConfig.url}/`,
        logo: absoluteUrl(siteConfig.logo),
        ...(siteConfig.contactEmail !== "" && { email: siteConfig.contactEmail }),
        sameAs: socialProfiles(),
        parentOrganization: {
          "@type": "Organization",
          name: siteConfig.parentOrganization.name,
          url: siteConfig.parentOrganization.url
        }
      },
      {
        "@type": "WebSite",
        "@id": SITE_ID,
        name: siteConfig.name,
        alternateName: [...siteConfig.alternateNames],
        url: `${siteConfig.url}/`,
        inLanguage: locale,
        publisher: { "@id": ORG_ID }
      }
    ]
  };
}

/**
 * Event markup for an event page, or null when the event has no city: search
 * engines require a place, and a program without one (e.g. a course run over
 * several months) is not an event they can show.
 */
export function eventJsonLd(event: SflEvent, locale: Locale) {
  if (!event.city) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.excerpt,
    startDate: event.date,
    endDate: event.endDate ?? event.date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venue ?? event.city,
      address: {
        "@type": "PostalAddress",
        ...(event.venue && { streetAddress: event.venue }),
        addressLocality: event.city
      }
    },
    image: [absoluteUrl(event.coverUrl)],
    url: canonicalUrl(locale, { pathname: "/evenimente/[slug]", params: { slug: event.slug } }),
    inLanguage: locale,
    // External events (e.g. LibertyCon) are organized by someone else.
    ...(!event.external && {
      organizer: { "@type": "Organization", "@id": ORG_ID, name: siteConfig.name, url: `${siteConfig.url}/` }
    }),
    ...(event.speakers.length > 0 && {
      performer: event.speakers.map((name) => ({ "@type": "Person", name }))
    })
  };
}
