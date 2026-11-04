import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import type { Locale } from "@/lib/events";

// Long-form pages (e.g. the privacy policy) live in content/pages/<name>/<locale>.mdx,
// so their text can be edited like an event description instead of in messages/*.json.

const DEFAULT_DIR = path.join(process.cwd(), "content", "pages");

const frontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  // YAML reads an unquoted 2026-11-04 as a Date; accept it as well as the quoted form.
  updated: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD"),
    z.date().transform((d) => d.toISOString().slice(0, 10))
  ])
});

export type ContentPage = z.infer<typeof frontmatterSchema> & { body: string };

export function getPage(name: string, locale: Locale, dir = DEFAULT_DIR): ContentPage {
  const file = path.join(dir, name, `${locale}.mdx`);
  if (!fs.existsSync(file)) throw new Error(`content/pages/${name}: missing ${locale}.mdx`);
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  const fm = frontmatterSchema.safeParse(data);
  if (!fm.success) {
    const issue = fm.error.issues[0];
    throw new Error(`content/pages/${name}/${locale}.mdx: ${issue.path.join(".")} ${issue.message}`);
  }
  return { ...fm.data, body: content.trim() };
}
