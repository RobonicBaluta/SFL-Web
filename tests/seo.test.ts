import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { getAllEvents, LOCALES, type SflEvent } from "@/lib/events";
import { mdxProblem } from "@/lib/mdx-check";
import { getPage } from "@/lib/pages";
import { alternatesFor, openGraphFor, pageMetadata, shareImageUrl } from "@/lib/seo";
import { eventJsonLd, homeJsonLd } from "@/lib/structured-data";
import { siteConfig } from "@/site.config";

function makeEvent(overrides: Partial<SflEvent>): SflEvent {
  return {
    slug: "2026-11-conferinta",
    date: "2026-11-05",
    city: "București",
    venue: "Sala Agora, Strada General Christian Tell nr. 22",
    speakers: ["Ana Pop"],
    moderators: [],
    partners: [],
    sponsors: [],
    tags: [],
    cover: "poster.jpg",
    coverPosition: "center",
    external: false,
    title: "Conferință",
    excerpt: "Despre libertate.",
    body: "",
    images: [],
    coverUrl: "/events/2026-11-conferinta/poster.jpg",
    ...overrides
  };
}

describe("canonical URLs", () => {
  it("are absolute on the production domain, with hreflang for both locales", () => {
    const a = alternatesFor("en", "/despre-noi");
    expect(a.canonical).toBe(`${siteConfig.url}/en/about`);
    expect(a.languages).toEqual({
      ro: `${siteConfig.url}/despre-noi`,
      en: `${siteConfig.url}/en/about`,
      "x-default": `${siteConfig.url}/despre-noi`
    });
  });

  it("the production domain has no trailing slash or vercel.app host", () => {
    expect(siteConfig.url).toMatch(/^https:\/\/[^/]+$/);
    expect(siteConfig.url).not.toContain("vercel.app");
  });
});

describe("share previews", () => {
  it("resize the image and encode file names with spaces", () => {
    expect(shareImageUrl("/events/x/WhatsApp Image 1.jpeg")).toBe(
      `${siteConfig.url}/_next/image?url=%2Fevents%2Fx%2FWhatsApp%20Image%201.jpeg&w=1200&q=75`
    );
  });

  it("every page gets the full Open Graph set, not just the overridden image", () => {
    const meta = pageMetadata("ro", "/evenimente", { title: "T", description: "D", image: "/a.jpg" });
    expect(meta.openGraph).toMatchObject({
      type: "website",
      siteName: siteConfig.name,
      locale: "ro_RO",
      alternateLocale: "en_US",
      url: `${siteConfig.url}/evenimente`,
      images: [shareImageUrl("/a.jpg")]
    });
    expect(openGraphFor("en", null)).not.toHaveProperty("url");
  });
});

describe("structured data", () => {
  it("describes the organization with its logo and social profiles", () => {
    const graph = homeJsonLd("ro")["@graph"];
    const org = graph[0] as { name: string; logo: string; sameAs: string[] };
    const site = graph[1];
    expect(org).toMatchObject({ "@type": "Organization", name: siteConfig.name });
    expect(org.logo).toBe(`${siteConfig.url}${siteConfig.logo}`);
    expect(org.sameAs.length).toBeGreaterThan(0);
    expect(org.sameAs).not.toContain("");
    expect(site).toMatchObject({ "@type": "WebSite", url: `${siteConfig.url}/` });
  });

  it("marks up an event with its place, organizer and speakers", () => {
    const data = eventJsonLd(makeEvent({}), "ro");
    expect(data).toMatchObject({
      "@type": "Event",
      name: "Conferință",
      startDate: "2026-11-05",
      endDate: "2026-11-05",
      location: {
        name: "Sala Agora, Strada General Christian Tell nr. 22",
        address: { addressLocality: "București" }
      },
      url: `${siteConfig.url}/evenimente/2026-11-conferinta`,
      organizer: { name: siteConfig.name },
      performer: [{ "@type": "Person", name: "Ana Pop" }]
    });
  });

  it("leaves out the organizer for external events and the markup for placeless ones", () => {
    expect(eventJsonLd(makeEvent({ external: true }), "en")).not.toHaveProperty("organizer");
    expect(eventJsonLd(makeEvent({ city: undefined }), "en")).toBeNull();
  });

  it("works for every real event", () => {
    for (const locale of LOCALES) {
      for (const e of getAllEvents(locale)) expect(() => JSON.stringify(eventJsonLd(e, locale))).not.toThrow();
    }
  });
});

describe("privacy policy", () => {
  it("exists in every locale, compiles as MDX and names the site's contact email", async () => {
    for (const locale of LOCALES) {
      const page = getPage("confidentialitate", locale);
      expect(await mdxProblem(page.body), `confidentialitate/${locale}.mdx`).toBeNull();
      expect(page.body, `confidentialitate/${locale}.mdx`).toContain(siteConfig.contactEmail);
    }
  });
});

describe("sitemap", () => {
  it("lists every page on the production domain, with its translations", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain(`${siteConfig.url}/confidentialitate`);
    expect(urls).toContain(`${siteConfig.url}/en/privacy`);
    for (const e of entries) {
      expect(e.url.startsWith(siteConfig.url)).toBe(true);
      expect(e.alternates?.languages).toHaveProperty("en");
    }
  });
});
