import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import ro from "../messages/ro.json";
import { getAllEvents, getAllSlugs, LOCALES } from "@/lib/events";

describe("real content", () => {
  // Deliberately not asserting a fixed event count: adding an event is a routine
  // content change and must never fail the build just for being new.
  it("has events, each in a YYYY-MM-slug folder", () => {
    const slugs = getAllSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) expect(slug, slug).toMatch(/^\d{4}-\d{2}-[a-z0-9-]+$/);
  });

  it("every event loads in every locale (schema + both mdx files)", () => {
    const expected = getAllSlugs().length;
    for (const locale of LOCALES) {
      const events = getAllEvents(locale);
      expect(events).toHaveLength(expected);
      for (const e of events) {
        expect(e.title.length).toBeGreaterThan(0);
        expect(e.excerpt.length).toBeGreaterThan(0);
        expect(e.body.length).toBeGreaterThan(0);
        expect(e.images.length).toBeGreaterThan(0);
      }
    }
  });

  it("every event tag has a translation in both locales", () => {
    const roTags = ro.tags as Record<string, string>;
    const enTags = en.tags as Record<string, string>;
    for (const e of getAllEvents("ro")) {
      for (const tag of e.tags) {
        expect(roTags[tag], `ro tag ${tag}`).toBeTruthy();
        expect(enTags[tag], `en tag ${tag}`).toBeTruthy();
      }
    }
  });
});
