import { z } from "zod";
import { eventMetaSchema } from "@/lib/events";
import { mdxProblem } from "@/lib/mdx-check";
import { filesFromDraft, type EventDraft } from "./draft";
import { encodeBody } from "./text";

// Server only: validates what the admin form sends and turns it into file changes.

export const SLUG_PATTERN = /^\d{4}-\d{2}-[a-z0-9-]+$/;
/** Names the admin gives new photos (see naming.ts). Existing photos keep theirs. */
const NEW_PHOTO_NAME = /^[a-z0-9][a-z0-9-]*\.jpg$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PHOTOS = 40;

const text = (max: number) => z.string().max(max);
const localized = z.object({ ro: text(200), en: text(200) });
const nameList = z.array(text(200)).max(30);
const localeText = z.object({ title: text(200), excerpt: text(400), body: text(20_000) });

export const savePayloadSchema = z.object({
  mode: z.enum(["create", "edit"]),
  draft: z.object({
    slug: text(80),
    date: text(10),
    endDate: text(10),
    city: localized,
    venue: localized,
    speakers: nameList,
    moderators: nameList,
    partners: nameList,
    sponsors: nameList,
    tags: z.array(text(60)).max(20),
    cover: text(200),
    coverPosition: text(20),
    external: z.boolean(),
    ro: localeText,
    en: localeText,
    images: z.array(text(200)).max(MAX_PHOTOS)
  }),
  newPhotos: z
    .array(z.object({ name: text(200), sha: z.string().regex(/^[0-9a-f]{40}$/) }))
    .max(MAX_PHOTOS)
});

export type SavePayload = { mode: "create" | "edit"; draft: EventDraft; newPhotos: { name: string; sha: string }[] };

/** What the server knows about the events currently in the repository. */
export type SaveContext = {
  existing: { slug: string; images: string[] }[];
  knownTags: string[];
};

const LANGUAGES = [
  ["ro", "Romanian"],
  ["en", "English"]
] as const;

/** Every reason the save would be refused or break the build; empty when it is fine. */
export async function checkSave(payload: SavePayload, ctx: SaveContext): Promise<string[]> {
  const { mode, draft, newPhotos } = payload;
  const problems: string[] = [];
  const current = ctx.existing.find((e) => e.slug === draft.slug);

  if (!SLUG_PATTERN.test(draft.slug)) {
    problems.push("The web address must look like 2026-10-name (lowercase letters, digits and dashes).");
  } else if (mode === "create" && current) {
    problems.push(`An event with the web address ${draft.slug} already exists. Change the address.`);
  } else if (mode === "edit" && !current) {
    problems.push("This event no longer exists (it may have been deleted).");
  }

  if (!ISO_DATE.test(draft.date)) problems.push("Pick the event date.");
  else if (draft.endDate && (!ISO_DATE.test(draft.endDate) || draft.endDate < draft.date)) {
    problems.push("The end date is before the start date.");
  }

  for (const [locale, language] of LANGUAGES) {
    const t = draft[locale];
    if (!t.title.trim()) problems.push(`The ${language} title is empty.`);
    if (!t.excerpt.trim()) problems.push(`The ${language} short summary is empty.`);
    if (!t.body.trim()) problems.push(`The ${language} text is empty.`);
    else {
      const problem = await mdxProblem(encodeBody(t.body.trim()));
      if (problem) problems.push(`The ${language} text can't be published (${problem}).`);
    }
  }

  for (const tag of draft.tags) {
    if (!ctx.knownTags.includes(tag)) problems.push(`Unknown tag "${tag}".`);
  }

  const existingImages = mode === "edit" ? (current?.images ?? []) : [];
  const uploaded = new Set(newPhotos.map((p) => p.name));
  for (const name of uploaded) {
    if (!NEW_PHOTO_NAME.test(name)) problems.push(`Invalid photo name "${name}".`);
    else if (existingImages.includes(name)) problems.push(`A photo named ${name} already exists.`);
  }
  if (draft.images.length === 0) problems.push("Add at least one photo (it becomes the cover).");
  for (const name of draft.images) {
    if (!existingImages.includes(name) && !uploaded.has(name)) {
      problems.push(`The photo ${name} was not uploaded. Add it again.`);
    }
  }
  if (draft.images.length > 0 && !draft.images.includes(draft.cover)) {
    problems.push("Choose a cover photo.");
  }

  if (problems.length === 0) {
    const meta = eventMetaSchema.safeParse(JSON.parse(filesFromDraft(draft).eventJson));
    if (!meta.success) {
      const issue = meta.error.issues[0];
      problems.push(`event.json: ${issue.path.join(".")} ${issue.message}`);
    }
  }
  return problems;
}

/** A change to one file in the commit: new text, an uploaded blob, or a deletion. */
export type FileChange =
  | { path: string; content: string }
  | { path: string; sha: string }
  | { path: string; sha: null };

export function saveChanges(payload: SavePayload, existingImages: string[]): FileChange[] {
  const { draft, newPhotos } = payload;
  const base = `content/events/${draft.slug}`;
  const files = filesFromDraft(draft);
  return [
    { path: `${base}/event.json`, content: files.eventJson },
    { path: `${base}/ro.mdx`, content: files.roMdx },
    { path: `${base}/en.mdx`, content: files.enMdx },
    // Photos uploaded and then removed again in the form are simply never committed.
    ...newPhotos
      .filter((p) => draft.images.includes(p.name))
      .map((p) => ({ path: `${base}/images/${p.name}`, sha: p.sha })),
    ...existingImages
      .filter((name) => !draft.images.includes(name))
      .map((name) => ({ path: `${base}/images/${name}`, sha: null }))
  ];
}
