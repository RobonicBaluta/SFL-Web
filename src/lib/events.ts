import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const LOCALES = ["ro", "en"] as const;
export type Locale = (typeof LOCALES)[number];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
/** CSS object-position: a keyword, or "X% Y%" measured from the top-left corner. */
const COVER_POSITION = /^(top|center|bottom|left|right|(100|\d{1,2})% (100|\d{1,2})%)$/;
const DEFAULT_DIR = path.join(process.cwd(), "content", "events");

const localizedString = z.object({
  ro: z.string().min(1),
  en: z.string().min(1)
});

export const eventMetaSchema = z.object({
  slug: z.string().min(1),
  date: z.string().regex(ISO_DATE, "must be YYYY-MM-DD"),
  endDate: z.string().regex(ISO_DATE, "must be YYYY-MM-DD").optional(),
  city: localizedString.optional(),
  venue: localizedString.optional(),
  speakers: z.array(z.string().min(1)).default([]),
  moderators: z.array(z.string().min(1)).default([]),
  partners: z.array(z.string().min(1)).default([]),
  sponsors: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1)).default([]),
  cover: z.string().min(1),
  coverPosition: z
    .string()
    .regex(
      COVER_POSITION,
      'must be top, center, bottom, left, right, or "X% Y%" (e.g. "50% 25%")'
    )
    .default("center"),
  external: z.boolean().default(false)
});

const frontmatterSchema = z.object({
  title: z.string().min(1),
  excerpt: z.string().min(1)
});

export type SflEvent = {
  slug: string;
  date: string;
  endDate?: string;
  city?: string;
  venue?: string;
  speakers: string[];
  moderators: string[];
  partners: string[];
  sponsors: string[];
  tags: string[];
  cover: string;
  coverPosition: string;
  external: boolean;
  title: string;
  excerpt: string;
  body: string;
  images: string[];
  coverUrl: string;
};

function fail(context: string, error: z.ZodError): never {
  const issue = error.issues[0];
  throw new Error(`${context}: ${issue.path.join(".")} ${issue.message}`);
}

export function getEventFolders(dir = DEFAULT_DIR): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name)
    .sort();
}

export function loadEvent(folder: string, locale: Locale, dir = DEFAULT_DIR): SflEvent {
  const eventDir = path.join(dir, folder);

  const metaPath = path.join(eventDir, "event.json");
  if (!fs.existsSync(metaPath)) throw new Error(`${folder}: missing event.json`);
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch (e) {
    throw new Error(`${folder}/event.json: invalid JSON — ${(e as Error).message}`);
  }
  const parsed = eventMetaSchema.safeParse(raw);
  if (!parsed.success) fail(`${folder}/event.json`, parsed.error);
  const meta = parsed.data;
  if (meta.slug !== folder) {
    throw new Error(`${folder}/event.json: slug "${meta.slug}" must match the folder name`);
  }
  if (meta.endDate && meta.endDate < meta.date) {
    throw new Error(`${folder}/event.json: endDate is before date`);
  }

  const mdxPath = path.join(eventDir, `${locale}.mdx`);
  if (!fs.existsSync(mdxPath)) throw new Error(`${folder}: missing ${locale}.mdx`);
  const { data, content } = matter(fs.readFileSync(mdxPath, "utf8"));
  const fm = frontmatterSchema.safeParse(data);
  if (!fm.success) fail(`${folder}/${locale}.mdx`, fm.error);

  const imagesDir = path.join(eventDir, "images");
  const files = fs.existsSync(imagesDir)
    ? fs.readdirSync(imagesDir).filter((f) => IMAGE_EXT.test(f)).sort()
    : [];
  if (files.length === 0) throw new Error(`${folder}: images/ has no images`);
  if (!files.includes(meta.cover)) {
    throw new Error(`${folder}/event.json: cover "${meta.cover}" not found in images/`);
  }

  return {
    slug: meta.slug,
    date: meta.date,
    endDate: meta.endDate,
    city: meta.city?.[locale],
    venue: meta.venue?.[locale],
    speakers: meta.speakers,
    moderators: meta.moderators,
    partners: meta.partners,
    sponsors: meta.sponsors,
    tags: meta.tags,
    cover: meta.cover,
    coverPosition: meta.coverPosition,
    external: meta.external,
    title: fm.data.title,
    excerpt: fm.data.excerpt,
    body: content.trim(),
    images: files.map((f) => `/events/${folder}/${f}`),
    coverUrl: `/events/${folder}/${meta.cover}`
  };
}

export function getAllEvents(locale: Locale, dir = DEFAULT_DIR): SflEvent[] {
  return getEventFolders(dir).map((folder) => loadEvent(folder, locale, dir));
}

export function getEventBySlug(slug: string, locale: Locale, dir = DEFAULT_DIR): SflEvent {
  return loadEvent(slug, locale, dir);
}

export function getAllSlugs(dir = DEFAULT_DIR): string[] {
  return getEventFolders(dir);
}

/** Returns YYYY-MM-DD for `now` in Europe/Bucharest (sv-SE formats as ISO). */
export function todayInBucharest(now: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

export function splitEvents(
  events: SflEvent[],
  now: Date
): { upcoming: SflEvent[]; past: SflEvent[] } {
  const today = todayInBucharest(now);
  const lastDay = (e: SflEvent) => e.endDate ?? e.date;
  return {
    upcoming: events
      .filter((e) => lastDay(e) >= today)
      .sort((a, b) => a.date.localeCompare(b.date)),
    past: events
      .filter((e) => lastDay(e) < today)
      .sort((a, b) => b.date.localeCompare(a.date))
  };
}
