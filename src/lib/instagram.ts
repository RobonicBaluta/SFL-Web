import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

/** Post or reel permalink, with or without a trailing slash. */
const POST_URL = /^https:\/\/www\.instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+\/?$/;

const DEFAULT_FILE = path.join(process.cwd(), "content", "instagram.json");
const DEFAULT_IMAGES_DIR = path.join(process.cwd(), "content", "instagram", "images");

/** How many tiles the section renders. */
export const INSTAGRAM_DISPLAY_LIMIT = 4;

export const instagramPostSchema = z.object({
  url: z.string().regex(POST_URL, "must be an instagram.com /p/ or /reel/ permalink"),
  image: z.string().min(1),
  pinned: z.boolean().default(false),
  postedAt: z.string().optional(),
  caption: z.string().optional(),
  /** Natural pixel size, recorded by the fetch script so tiles keep the post's own shape. */
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional()
});

export const instagramFileSchema = z.object({
  posts: z.array(instagramPostSchema).default([])
});

export type InstagramPost = z.infer<typeof instagramPostSchema>;

/** Pinned first (file order), then newest-first; undated entries last in file order. */
export function orderPosts(posts: InstagramPost[]): InstagramPost[] {
  const pinned = posts.filter((p) => p.pinned);
  const rest = posts.filter((p) => !p.pinned);
  const dated = rest.filter((p) => p.postedAt);
  const undated = rest.filter((p) => !p.postedAt);
  dated.sort((a, b) => (b.postedAt as string).localeCompare(a.postedAt as string));
  return [...pinned, ...dated, ...undated];
}

export function getInstagramPosts(
  file = DEFAULT_FILE,
  imagesDir = DEFAULT_IMAGES_DIR
): InstagramPost[] {
  if (!fs.existsSync(file)) return [];

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`instagram.json: invalid JSON — ${(e as Error).message}`);
  }

  const parsed = instagramFileSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`instagram.json: ${issue.path.join(".")} ${issue.message}`);
  }

  parsed.data.posts.forEach((post, i) => {
    if (!fs.existsSync(path.join(imagesDir, post.image))) {
      throw new Error(
        `instagram.json: posts[${i}].image "${post.image}" not found in content/instagram/images/`
      );
    }
  });

  return orderPosts(parsed.data.posts).slice(0, INSTAGRAM_DISPLAY_LIMIT);
}
