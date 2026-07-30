import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  eventMetaSchema,
  getAllEvents,
  getAllSlugs,
  loadEvent,
  splitEvents,
  todayInBucharest,
  type SflEvent
} from "@/lib/events";

const VALID = path.join(import.meta.dirname, "fixtures", "valid");
const INVALID = path.join(import.meta.dirname, "fixtures", "invalid");

function makeEvent(overrides: Partial<SflEvent>): SflEvent {
  return {
    slug: "e",
    date: "2026-01-01",
    speakers: [],
    moderators: [],
    partners: [],
    sponsors: [],
    tags: [],
    cover: "c.jpg",
    external: false,
    title: "T",
    excerpt: "X",
    body: "",
    images: [],
    coverUrl: "",
    ...overrides
  };
}

describe("loader", () => {
  it("loads a valid event in both locales", () => {
    const ro = loadEvent("2099-01-test-event", "ro", VALID);
    expect(ro.title).toBe("Eveniment de test");
    expect(ro.city).toBe("București");
    expect(ro.images).toEqual(["/events/2099-01-test-event/photo.jpg"]);
    expect(ro.coverUrl).toBe("/events/2099-01-test-event/photo.jpg");
    const en = loadEvent("2099-01-test-event", "en", VALID);
    expect(en.title).toBe("Test event");
    expect(en.city).toBe("Bucharest");
  });

  it("getAllSlugs skips _ folders and sorts", () => {
    expect(getAllSlugs(VALID)).toEqual(["2099-01-test-event"]);
  });

  it("getAllEvents loads everything", () => {
    expect(getAllEvents("ro", VALID)).toHaveLength(1);
  });

  it("rejects a malformed date, naming file and field", () => {
    expect(() => loadEvent("bad-date", "ro", INVALID)).toThrow(/bad-date\/event\.json: date/);
  });

  it("rejects a missing locale file", () => {
    expect(() => loadEvent("missing-en", "en", INVALID)).toThrow(/missing-en: missing en\.mdx/);
  });

  it("rejects a cover that is not in images/", () => {
    expect(() => loadEvent("bad-cover", "ro", INVALID)).toThrow(/bad-cover\/event\.json: cover/);
  });

  it("rejects malformed JSON, naming the file", () => {
    expect(() => loadEvent("bad-json", "ro", INVALID)).toThrow(
      /bad-json\/event\.json: invalid JSON/
    );
  });

  it("defaults coverPosition to center when omitted", () => {
    expect(loadEvent("2099-01-test-event", "ro", VALID).coverPosition).toBe("center");
  });

  it("rejects an unusable coverPosition, naming file and field", () => {
    expect(() => loadEvent("bad-cover-position", "ro", INVALID)).toThrow(
      /bad-cover-position\/event\.json: coverPosition/
    );
  });
});

describe("coverPosition values", () => {
  const accepted = ["top", "center", "bottom", "left", "right", "50% 25%", "0% 100%"];
  const rejected = ["middle-ish", "top left", "50%", "120% 10%", "50%25%", ""];

  it("accepts keywords and X% Y% percentages", () => {
    for (const value of accepted) {
      expect(
        eventMetaSchema.safeParse({ slug: "e", date: "2026-01-01", cover: "c.jpg", coverPosition: value })
          .success,
        value
      ).toBe(true);
    }
  });

  it("rejects anything else", () => {
    for (const value of rejected) {
      expect(
        eventMetaSchema.safeParse({ slug: "e", date: "2026-01-01", cover: "c.jpg", coverPosition: value })
          .success,
        value
      ).toBe(false);
    }
  });
});

describe("splitEvents", () => {
  const noon = new Date("2026-07-30T12:00:00Z");

  it("an event today is upcoming; yesterday is past", () => {
    const today = makeEvent({ slug: "today", date: "2026-07-30" });
    const yesterday = makeEvent({ slug: "yesterday", date: "2026-07-29" });
    const { upcoming, past } = splitEvents([today, yesterday], noon);
    expect(upcoming.map((e) => e.slug)).toEqual(["today"]);
    expect(past.map((e) => e.slug)).toEqual(["yesterday"]);
  });

  it("a running multi-day event (endDate in future) is upcoming", () => {
    const running = makeEvent({ slug: "run", date: "2026-07-01", endDate: "2026-08-01" });
    expect(splitEvents([running], noon).upcoming).toHaveLength(1);
  });

  it("upcoming is soonest-first, past is newest-first", () => {
    const a = makeEvent({ slug: "a", date: "2026-08-01" });
    const b = makeEvent({ slug: "b", date: "2026-09-01" });
    const c = makeEvent({ slug: "c", date: "2026-01-01" });
    const d = makeEvent({ slug: "d", date: "2026-02-01" });
    const { upcoming, past } = splitEvents([b, a, c, d], noon);
    expect(upcoming.map((e) => e.slug)).toEqual(["a", "b"]);
    expect(past.map((e) => e.slug)).toEqual(["d", "c"]);
  });

  it("uses Bucharest local date, not UTC", () => {
    // 21:30 UTC on Jul 30 is 00:30 on Jul 31 in Bucharest (UTC+3 in summer)
    expect(todayInBucharest(new Date("2026-07-30T21:30:00Z"))).toBe("2026-07-31");
  });
});
