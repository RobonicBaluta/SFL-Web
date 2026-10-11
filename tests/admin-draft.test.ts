import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { draftFromFiles, filesFromDraft, type EventDraft } from "@/lib/admin/draft";
import { eventMetaSchema, getAllSlugs } from "@/lib/events";

const FULL: EventDraft = {
  slug: "2026-10-chat-control",
  date: "2026-10-13",
  endDate: "2026-10-14",
  city: { ro: "București", en: "Bucharest" },
  venue: { ro: "Strada Aurel Vlaicu 47", en: "47 Aurel Vlaicu Street" },
  speakers: ["Ana Pop"],
  moderators: ["Ion Ion"],
  partners: ["Partener"],
  sponsors: ["Sponsor"],
  tags: ["debate"],
  cover: "cover.jpg",
  coverPosition: "50% 43%",
  external: true,
  ro: { title: 'Chat "Control": o discuție', excerpt: "Pe scurt.", body: "Taxa {0} lei." },
  en: { title: "Chat Control", excerpt: "In short.", body: "Fee {0} lei." },
  images: ["cover.jpg", "poza.jpg"]
};

const FULL_JSON = `{
  "slug": "2026-10-chat-control",
  "date": "2026-10-13",
  "endDate": "2026-10-14",
  "city": {
    "ro": "București",
    "en": "Bucharest"
  },
  "venue": {
    "ro": "Strada Aurel Vlaicu 47",
    "en": "47 Aurel Vlaicu Street"
  },
  "speakers": [
    "Ana Pop"
  ],
  "moderators": [
    "Ion Ion"
  ],
  "partners": [
    "Partener"
  ],
  "sponsors": [
    "Sponsor"
  ],
  "tags": [
    "debate"
  ],
  "cover": "cover.jpg",
  "coverPosition": "50% 43%",
  "external": true
}
`;

const FULL_RO = `---
title: "Chat \\"Control\\": o discuție"
excerpt: "Pe scurt."
---

Taxa &#123;0&#125; lei.
`;

const minimal = (overrides: Partial<EventDraft>): EventDraft => ({
  ...FULL,
  endDate: "",
  city: { ro: "", en: "" },
  venue: { ro: "", en: "" },
  speakers: [],
  moderators: [],
  partners: [],
  sponsors: [],
  tags: [],
  coverPosition: "center",
  external: false,
  ...overrides
});

describe("filesFromDraft", () => {
  it("writes every field in the loader's format", () => {
    const files = filesFromDraft(FULL);
    expect(files.eventJson).toBe(FULL_JSON);
    expect(files.roMdx).toBe(FULL_RO);
  });

  it("leaves out empty and default values", () => {
    expect(JSON.parse(filesFromDraft(minimal({})).eventJson)).toEqual({
      slug: "2026-10-chat-control",
      date: "2026-10-13",
      cover: "cover.jpg"
    });
  });

  it("copies the Romanian place name when the English one is empty", () => {
    const json = JSON.parse(
      filesFromDraft(minimal({ city: { ro: "Constanța", en: " " } })).eventJson
    );
    expect(json.city).toEqual({ ro: "Constanța", en: "Constanța" });
  });

  it("trims names and drops blank ones", () => {
    const json = JSON.parse(
      filesFromDraft(minimal({ speakers: ["  Ana Pop ", "", "  "] })).eventJson
    );
    expect(json.speakers).toEqual(["Ana Pop"]);
  });
});

describe("draftFromFiles", () => {
  it("reads every field back, with plain text in the bodies", () => {
    const files = { eventJson: FULL_JSON, roMdx: FULL_RO, enMdx: filesFromDraft(FULL).enMdx };
    expect(draftFromFiles(files, ["cover.jpg", "poza.jpg"])).toEqual(FULL);
  });

  it("fills defaults for fields the file leaves out", () => {
    const files = filesFromDraft(minimal({}));
    expect(draftFromFiles(files, FULL.images)).toEqual(minimal({}));
  });

  it("names the broken field of an invalid event.json", () => {
    const files = { ...filesFromDraft(FULL), eventJson: '{"slug":"x","date":"13.10.2026"}' };
    expect(() => draftFromFiles(files, [])).toThrow(/event\.json: date/);
  });
});

describe("round trip over the real events", () => {
  const dir = path.join(process.cwd(), "content", "events");
  // The admin reads files from GitHub, which stores LF; a Windows checkout has CRLF.
  const read = (slug: string, file: string) =>
    fs.readFileSync(path.join(dir, slug, file), "utf8").replace(/\r\n/g, "\n");

  for (const slug of getAllSlugs()) {
    it(`${slug} survives load and save unchanged in meaning`, () => {
      const original = { eventJson: read(slug, "event.json"), roMdx: read(slug, "ro.mdx"), enMdx: read(slug, "en.mdx") };
      const saved = filesFromDraft(draftFromFiles(original, []));
      expect(eventMetaSchema.parse(JSON.parse(saved.eventJson))).toEqual(
        eventMetaSchema.parse(JSON.parse(original.eventJson))
      );
      for (const key of ["roMdx", "enMdx"] as const) {
        const before = matter(original[key]);
        const after = matter(saved[key]);
        expect(after.data, key).toEqual(before.data);
        expect(after.content.trim(), key).toBe(before.content.trim());
      }
    });
  }
});
