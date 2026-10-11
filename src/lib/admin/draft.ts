import matter from "gray-matter";
import { eventMetaSchema } from "@/lib/events";
import { decodeBody, encodeBody } from "./text";

// Server only (gray-matter, events loader). Client components import the types.

export type Localized = { ro: string; en: string };
export type LocaleText = { title: string; excerpt: string; body: string };

/** One event as the admin form edits it: plain text, "" for "not set". */
export type EventDraft = {
  slug: string;
  date: string;
  endDate: string;
  city: Localized;
  venue: Localized;
  speakers: string[];
  moderators: string[];
  partners: string[];
  sponsors: string[];
  tags: string[];
  cover: string;
  coverPosition: string;
  external: boolean;
  ro: LocaleText;
  en: LocaleText;
  images: string[];
};

/** The three text files of an event folder. */
export type EventFiles = { eventJson: string; roMdx: string; enMdx: string };

export function emptyDraft(): EventDraft {
  const text = { title: "", excerpt: "", body: "" };
  return {
    slug: "",
    date: "",
    endDate: "",
    city: { ro: "", en: "" },
    venue: { ro: "", en: "" },
    speakers: [],
    moderators: [],
    partners: [],
    sponsors: [],
    tags: [],
    cover: "",
    coverPosition: "center",
    external: false,
    ro: { ...text },
    en: { ...text },
    images: []
  };
}

function readText(mdx: string): LocaleText {
  const { data, content } = matter(mdx);
  return {
    title: String(data.title ?? ""),
    excerpt: String(data.excerpt ?? ""),
    body: decodeBody(content.trim())
  };
}

export function draftFromFiles(files: EventFiles, images: string[]): EventDraft {
  const parsed = eventMetaSchema.safeParse(JSON.parse(files.eventJson));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`event.json: ${issue.path.join(".")} ${issue.message}`);
  }
  const meta = parsed.data;
  return {
    slug: meta.slug,
    date: meta.date,
    endDate: meta.endDate ?? "",
    city: meta.city ?? { ro: "", en: "" },
    venue: meta.venue ?? { ro: "", en: "" },
    speakers: meta.speakers,
    moderators: meta.moderators,
    partners: meta.partners,
    sponsors: meta.sponsors,
    tags: meta.tags,
    cover: meta.cover,
    coverPosition: meta.coverPosition,
    external: meta.external,
    ro: readText(files.roMdx),
    en: readText(files.enMdx),
    images
  };
}

/** Both empty → left out; an empty English name copies the Romanian one. */
function place(value: Localized): Localized | undefined {
  const ro = value.ro.trim();
  const en = value.en.trim();
  if (!ro && !en) return undefined;
  return { ro: ro || en, en: en || ro };
}

function names(list: string[]): string[] | undefined {
  const kept = list.map((s) => s.trim()).filter(Boolean);
  return kept.length > 0 ? kept : undefined;
}

// JSON strings are valid YAML double-quoted scalars, which is what the
// hand-written files use for title and excerpt.
function writeText(text: LocaleText): string {
  return [
    "---",
    `title: ${JSON.stringify(text.title.trim())}`,
    `excerpt: ${JSON.stringify(text.excerpt.trim())}`,
    "---",
    "",
    encodeBody(text.body.trim()),
    ""
  ].join("\n");
}

export function filesFromDraft(draft: EventDraft): EventFiles {
  // Key order mirrors _TEMPLATE/event.json; undefined values are dropped by JSON.stringify.
  const meta = {
    slug: draft.slug,
    date: draft.date,
    endDate: draft.endDate || undefined,
    city: place(draft.city),
    venue: place(draft.venue),
    speakers: names(draft.speakers),
    moderators: names(draft.moderators),
    partners: names(draft.partners),
    sponsors: names(draft.sponsors),
    tags: draft.tags.length > 0 ? draft.tags : undefined,
    cover: draft.cover,
    coverPosition: draft.coverPosition === "center" ? undefined : draft.coverPosition,
    external: draft.external || undefined
  };
  return {
    eventJson: JSON.stringify(meta, null, 2) + "\n",
    roMdx: writeText(draft.ro),
    enMdx: writeText(draft.en)
  };
}
