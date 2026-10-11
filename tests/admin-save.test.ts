import { describe, expect, it } from "vitest";
import type { EventDraft } from "@/lib/admin/draft";
import {
  checkSave,
  eventVersion,
  saveChanges,
  savePayloadSchema,
  type SavePayload
} from "@/lib/admin/save";

const SHA = "a".repeat(40);

const draft = (overrides: Partial<EventDraft> = {}): EventDraft => ({
  slug: "2026-10-chat-control",
  date: "2026-10-13",
  endDate: "",
  city: { ro: "București", en: "Bucharest" },
  venue: { ro: "", en: "" },
  speakers: [],
  moderators: [],
  partners: [],
  sponsors: [],
  tags: ["debate"],
  cover: "afis.jpg",
  coverPosition: "center",
  external: false,
  ro: { title: "Chat Control", excerpt: "Pe scurt.", body: "Text." },
  en: { title: "Chat Control", excerpt: "In short.", body: "Text." },
  images: ["afis.jpg"],
  ...overrides
});

const create = (d: EventDraft, newPhotos = [{ name: "afis.jpg", sha: SHA }]): SavePayload => ({
  mode: "create",
  baseVersion: "",
  draft: d,
  newPhotos
});

const CTX = { existing: [{ slug: "2026-05-lrr-iasi", images: ["cover.jpeg"] }], knownTags: ["debate"] };

describe("checkSave", () => {
  it("accepts a complete new event", async () => {
    expect(await checkSave(create(draft()), CTX)).toEqual([]);
  });

  it("refuses to create over an existing event", async () => {
    const problems = await checkSave(create(draft({ slug: "2026-05-lrr-iasi" })), CTX);
    expect(problems.join()).toMatch(/already exists/);
  });

  it("refuses to edit an event that is gone", async () => {
    const payload: SavePayload = { mode: "edit", baseVersion: "", draft: draft(), newPhotos: [] };
    expect((await checkSave(payload, CTX)).join()).toMatch(/no longer exists/);
  });

  it("rejects a malformed web address", async () => {
    const problems = await checkSave(create(draft({ slug: "Chat Control" })), CTX);
    expect(problems.join()).toMatch(/web address/);
  });

  it("requires both languages' title, summary and text", async () => {
    const problems = await checkSave(
      create(draft({ en: { title: "", excerpt: " ", body: "" } })),
      CTX
    );
    expect(problems).toHaveLength(3);
    expect(problems.join()).toMatch(/English title/);
  });

  it("rejects an end date before the start date", async () => {
    const problems = await checkSave(create(draft({ endDate: "2026-10-12" })), CTX);
    expect(problems.join()).toMatch(/end date/);
  });

  it("rejects tags the site has no translation for", async () => {
    const problems = await checkSave(create(draft({ tags: ["party"] })), CTX);
    expect(problems.join()).toMatch(/party/);
  });

  it("requires a photo and a cover that is one of the photos", async () => {
    expect((await checkSave(create(draft({ images: [], cover: "" }), []), CTX)).join()).toMatch(
      /at least one photo/
    );
    expect((await checkSave(create(draft({ cover: "alta.jpg" })), CTX)).join()).toMatch(/cover/);
  });

  it("rejects a photo that was never uploaded", async () => {
    const problems = await checkSave(create(draft({ images: ["afis.jpg", "lipsa.jpg"] })), CTX);
    expect(problems.join()).toMatch(/lipsa\.jpg/);
  });

  it("rejects an uploaded photo name that would overwrite an existing one", async () => {
    const payload: SavePayload = {
      mode: "edit",
      baseVersion: eventVersion({}, ["cover.jpeg"]),
      draft: draft({ slug: "2026-05-lrr-iasi", cover: "cover.jpeg", images: ["cover.jpeg"] }),
      newPhotos: [{ name: "cover.jpeg", sha: SHA }]
    };
    expect((await checkSave(payload, CTX)).join()).toMatch(/cover\.jpeg/);
  });

  it("accepts text with braces and < because it is encoded", async () => {
    const d = draft({ ro: { title: "T", excerpt: "E", body: "Taxa {15 euro}, copii <12 ani" } });
    expect(await checkSave(create(d), CTX)).toEqual([]);
  });
});

describe("eventVersion", () => {
  const files = { eventJson: "{}", roMdx: "ro", enMdx: "en" };

  it("ignores the order photos are listed in", () => {
    expect(eventVersion(files, ["a.jpg", "b.jpg"])).toBe(eventVersion(files, ["b.jpg", "a.jpg"]));
  });

  it("changes when the text or the photos change", () => {
    const v = eventVersion(files, ["a.jpg"]);
    expect(eventVersion({ ...files, roMdx: "ro!" }, ["a.jpg"])).not.toBe(v);
    expect(eventVersion(files, ["a.jpg", "b.jpg"])).not.toBe(v);
  });
});

describe("checkSave on a form opened earlier", () => {
  const files = { eventJson: "{}", roMdx: "ro", enMdx: "en" };
  const ctx = { existing: [{ slug: "2026-05-lrr-iasi", images: ["cover.jpeg"], files }], knownTags: ["debate"] };
  const edit = (baseVersion: string): SavePayload => ({
    mode: "edit",
    baseVersion,
    draft: draft({ slug: "2026-05-lrr-iasi", cover: "cover.jpeg", images: ["cover.jpeg"] }),
    newPhotos: []
  });

  it("accepts the save when nothing changed in between", async () => {
    expect(await checkSave(edit(eventVersion(files, ["cover.jpeg"])), ctx)).toEqual([]);
  });

  it("refuses when the event was changed elsewhere since the form was loaded", async () => {
    const before = eventVersion(files, []); // a photo was added on another device since
    expect((await checkSave(edit(before), ctx)).join()).toMatch(/changed somewhere else/);
  });
});

describe("savePayloadSchema", () => {
  it("counts blank lines in name lists towards nothing that fails the form", () => {
    const names = [...Array.from({ length: 30 }, (_, i) => `Name ${i}`), "", "", ""];
    expect(savePayloadSchema.safeParse(create(draft({ speakers: names }))).success).toBe(true);
  });

  it("enforces length limits", () => {
    const long = draft({ ro: { title: "x".repeat(201), excerpt: "E", body: "B" } });
    expect(savePayloadSchema.safeParse(create(long)).success).toBe(false);
    expect(savePayloadSchema.safeParse(create(draft())).success).toBe(true);
  });

  it("only accepts git object ids as photo shas", () => {
    expect(savePayloadSchema.safeParse(create(draft(), [{ name: "afis.jpg", sha: "../x" }])).success).toBe(false);
  });
});

describe("saveChanges", () => {
  it("writes the text files, adds uploaded photos and removes dropped ones", () => {
    const payload: SavePayload = {
      mode: "edit",
      baseVersion: eventVersion({}, ["cover.jpeg"]),
      draft: draft({ slug: "2026-05-lrr-iasi", cover: "noua.jpg", images: ["pastrata.jpg", "noua.jpg"] }),
      newPhotos: [
        { name: "noua.jpg", sha: SHA },
        { name: "renuntat.jpg", sha: "b".repeat(40) }
      ]
    };
    const base = "content/events/2026-05-lrr-iasi";
    const changes = saveChanges(payload, ["pastrata.jpg", "stearsa.jpg"]);
    expect(changes.map((c) => [c.path, "content" in c ? "text" : c.sha])).toEqual([
      [`${base}/event.json`, "text"],
      [`${base}/ro.mdx`, "text"],
      [`${base}/en.mdx`, "text"],
      [`${base}/images/noua.jpg`, SHA],
      [`${base}/images/stearsa.jpg`, null]
    ]);
  });
});
