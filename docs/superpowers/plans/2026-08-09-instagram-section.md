# Instagram Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a curated strip of Instagram posts on the home page, fed by a curation-time script that works with or without an Instagram token, so the published site never calls Meta.

**Architecture:** `content/instagram.json` is the single source of truth. A Node script (`scripts/instagram-fetch.mjs`) fills it: with `INSTAGRAM_TOKEN` it auto-discovers recent posts via the Graph API; without one it resolves pasted post URLs through public Open Graph metadata. Either way it downloads images into `content/instagram/images/`, which the existing sync step copies to `public/instagram/`. A zod-validated loader (`src/lib/instagram.ts`) feeds a server component rendered on the home page.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Tailwind 4, next-intl, zod 4, vitest 3, Node 20+ (`node:fs`, global `fetch`).

**Spec:** `docs/superpowers/specs/2026-08-09-instagram-section-design.md`

## Global Constraints

- **100% i18n:** no literal user-facing strings in JSX. ESLint `react/jsx-no-literals` is enforced on `src/**/*.tsx` with allowlist `["RO","EN","•","–","|","©"]`. New UI text goes in a new `instagram` namespace in BOTH `messages/ro.json` and `messages/en.json` (a key-parity test enforces both).
- **No Meta calls from the app.** `src/**` must never fetch instagram.com or graph.facebook.com. Only `scripts/instagram-fetch.mjs` touches the network, and it is run by a human, never by `next build`.
- **Token never leaves the machine:** read `INSTAGRAM_TOKEN` from `.env.local` (already git-ignored via `.env*`). Never referenced in `src/**`, never set on Vercel.
- Brand tokens: `sfl-gold` `#ffc627`, `sfl-black` `#1a1a1a`, `sfl-gray` `#4b4b4b`; fonts `font-display` (Oswald) / `font-body` (Inter).
- Card treatment to match existing `EventCard`: `border-2 border-sfl-black` + `hover:shadow-[6px_6px_0_0_var(--color-sfl-gold)]`.
- Windows dev machine: use the Bash tool (Git Bash); scripts must be cross-platform (`node:path`, no shell-isms).
- Conventional commits; commit at the end of every task.
- Display limit is 4 tiles; auto-fetch pulls 12; retention prunes non-pinned entries beyond 20.
- User agent for Open Graph fetches: `SFL-Romania-Site/1.0 (+https://sfl-romania.vercel.app)`.

## File Map

| Path | Responsibility | Task |
|---|---|---|
| `src/lib/instagram.ts` | Types, zod schema, ordering, display limit, disk validation | 1 |
| `tests/instagram.test.ts` | Schema + ordering + limit tests | 1 |
| `content/instagram.json` | Curated post list (starts with the 4 real posts) | 1, 3 |
| `scripts/instagram-og.mjs` | Pure Open Graph parsing (no network) | 2 |
| `tests/instagram-og.test.ts` | Parser tests against saved fixture HTML | 2 |
| `scripts/instagram-fetch.mjs` | Network + merge + prune orchestration, `npm run instagram:fetch` | 2 |
| `scripts/sync-event-images.mjs` | Extended to also sync `content/instagram/images/` | 3 |
| `messages/{ro,en}.json` | `instagram` namespace | 4 |
| `src/components/InstagramSection.tsx` | The section component | 4 |
| `src/app/[locale]/page.tsx` | Renders the section before the join CTA | 4 |
| `README.md` | Bilingual "adding Instagram posts" docs | 5 |

---

### Task 1: Content model and loader (TDD)

**Files:**
- Create: `src/lib/instagram.ts`, `tests/instagram.test.ts`, `content/instagram.json`
- Test: `tests/instagram.test.ts`

**Interfaces:**
- Consumes: nothing (pure lib).
- Produces, used by Tasks 2-4:
  - `type InstagramPost = { url: string; image: string; pinned: boolean; postedAt?: string; caption?: string }`
  - `const INSTAGRAM_DISPLAY_LIMIT = 4`
  - `instagramFileSchema` (zod) parsing `{ posts: [...] }`
  - `orderPosts(posts: InstagramPost[]): InstagramPost[]` — pinned first in file order, then by `postedAt` desc, undefined `postedAt` last in file order
  - `getInstagramPosts(file?: string, imagesDir?: string): InstagramPost[]` — parse + validate images exist on disk + order + slice to the display limit; returns `[]` when the file is absent

- [ ] **Step 1: Write the failing test** — `tests/instagram.test.ts`

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getInstagramPosts,
  INSTAGRAM_DISPLAY_LIMIT,
  instagramFileSchema,
  orderPosts,
  type InstagramPost
} from "@/lib/instagram";

const tmp: string[] = [];

function tmpDirWith(json: unknown, images: string[]): { file: string; imagesDir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ig-"));
  tmp.push(dir);
  const imagesDir = path.join(dir, "images");
  fs.mkdirSync(imagesDir);
  for (const img of images) fs.writeFileSync(path.join(imagesDir, img), "x");
  const file = path.join(dir, "instagram.json");
  fs.writeFileSync(file, JSON.stringify(json));
  return { file, imagesDir };
}

afterEach(() => {
  for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function post(over: Partial<InstagramPost> = {}): InstagramPost {
  return { url: "https://www.instagram.com/p/AAA111/", image: "AAA111.jpg", pinned: false, ...over };
}

describe("schema", () => {
  it("accepts a minimal post and defaults pinned to false", () => {
    const parsed = instagramFileSchema.parse({
      posts: [{ url: "https://www.instagram.com/p/AAA111/", image: "AAA111.jpg" }]
    });
    expect(parsed.posts[0].pinned).toBe(false);
  });

  it("accepts reel URLs and URLs without a trailing slash", () => {
    expect(
      instagramFileSchema.safeParse({
        posts: [
          { url: "https://www.instagram.com/reel/BBB222/", image: "b.jpg" },
          { url: "https://www.instagram.com/p/CCC333", image: "c.jpg" }
        ]
      }).success
    ).toBe(true);
  });

  it("rejects a non-Instagram URL", () => {
    const r = instagramFileSchema.safeParse({
      posts: [{ url: "https://example.com/p/AAA111/", image: "a.jpg" }]
    });
    expect(r.success).toBe(false);
  });

  it("rejects an empty image filename", () => {
    expect(
      instagramFileSchema.safeParse({ posts: [{ url: "https://www.instagram.com/p/A/", image: "" }] })
        .success
    ).toBe(false);
  });
});

describe("orderPosts", () => {
  it("puts pinned first in file order, then newest-first", () => {
    const ordered = orderPosts([
      post({ image: "old.jpg", postedAt: "2026-01-01" }),
      post({ image: "pin2.jpg", pinned: true }),
      post({ image: "new.jpg", postedAt: "2026-08-01" }),
      post({ image: "pin1.jpg", pinned: true })
    ]);
    expect(ordered.map((p) => p.image)).toEqual(["pin2.jpg", "pin1.jpg", "new.jpg", "old.jpg"]);
  });

  it("keeps posts without postedAt after dated ones, in file order", () => {
    const ordered = orderPosts([
      post({ image: "undated1.jpg" }),
      post({ image: "dated.jpg", postedAt: "2026-05-05" }),
      post({ image: "undated2.jpg" })
    ]);
    expect(ordered.map((p) => p.image)).toEqual(["dated.jpg", "undated1.jpg", "undated2.jpg"]);
  });
});

describe("getInstagramPosts", () => {
  it("returns [] when the file does not exist", () => {
    expect(getInstagramPosts(path.join(os.tmpdir(), "nope-ig.json"))).toEqual([]);
  });

  it("returns [] for an empty list", () => {
    const { file, imagesDir } = tmpDirWith({ posts: [] }, []);
    expect(getInstagramPosts(file, imagesDir)).toEqual([]);
  });

  it("slices to the display limit after ordering", () => {
    const images = ["a.jpg", "b.jpg", "c.jpg", "d.jpg", "e.jpg"];
    const { file, imagesDir } = tmpDirWith(
      { posts: images.map((image, i) => ({ url: `https://www.instagram.com/p/X${i}/`, image })) },
      images
    );
    const got = getInstagramPosts(file, imagesDir);
    expect(got).toHaveLength(INSTAGRAM_DISPLAY_LIMIT);
    expect(INSTAGRAM_DISPLAY_LIMIT).toBe(4);
  });

  it("throws naming file and index when an image is missing from disk", () => {
    const { file, imagesDir } = tmpDirWith(
      { posts: [{ url: "https://www.instagram.com/p/A/", image: "ghost.jpg" }] },
      []
    );
    expect(() => getInstagramPosts(file, imagesDir)).toThrow(
      /instagram\.json: posts\[0\]\.image "ghost\.jpg" not found/
    );
  });

  it("throws naming the file when the JSON is malformed", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ig-"));
    tmp.push(dir);
    const file = path.join(dir, "instagram.json");
    fs.writeFileSync(file, "{ not json");
    expect(() => getInstagramPosts(file, dir)).toThrow(/instagram\.json: invalid JSON/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/instagram.test.ts`
Expected: FAIL — cannot resolve `@/lib/instagram`.

- [ ] **Step 3: Implement `src/lib/instagram.ts`**

```ts
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
  caption: z.string().optional()
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
```

- [ ] **Step 4: Create `content/instagram.json` with the four real posts**

Images are downloaded in Task 3; the file starts with URLs only. Because `image` is required by the schema, this file is not yet loadable — Task 3's fetch fills it in, and `getInstagramPosts` is only wired into a page in Task 4, so nothing renders from it meanwhile.

```json
{
  "posts": [
    { "url": "https://www.instagram.com/p/Dbqm8pdosiZ/" },
    { "url": "https://www.instagram.com/p/DaioapuiJqq/" },
    { "url": "https://www.instagram.com/p/DY6ydBfiEj7/" },
    { "url": "https://www.instagram.com/p/DYO3eEaIFN2/" }
  ]
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/instagram.test.ts`
Expected: PASS (all 11 tests). The real `content/instagram.json` is not read by these tests — they use temp fixtures.

- [ ] **Step 6: Commit**

```bash
git add src/lib/instagram.ts tests/instagram.test.ts content/instagram.json
git commit -m "feat(instagram): content model, zod validation and ordering"
```

---

### Task 2: Fetch script — Open Graph parser, Graph API sync, prune

**Files:**
- Create: `scripts/instagram-og.mjs`, `tests/instagram-og.test.ts`, `scripts/instagram-fetch.mjs`, `tests/fixtures/instagram/post.html`
- Modify: `package.json` (add `instagram:fetch` script)

**Interfaces:**
- Consumes: `InstagramPost` shape from Task 1 (`url`, `image`, `pinned`, `postedAt`, `caption`).
- Produces: `npm run instagram:fetch`; from `scripts/instagram-og.mjs`: `parseOpenGraph(html)` → `{ imageUrl, caption, postedAt } | null`, `shortcodeOf(url)` → `string | null`, `mergePosts(existing, incoming)` → `InstagramPost[]`, `prunePosts(posts, retention)` → `{ kept, dropped }`.

- [ ] **Step 1: Save a real fixture**

Run this once and commit the result — the parser tests read it instead of hitting the network:

```bash
mkdir -p tests/fixtures/instagram
curl -s -A "SFL-Romania-Site/1.0 (+https://sfl-romania.vercel.app)" \
  "https://www.instagram.com/p/Dbqm8pdosiZ/" \
  | grep -oE '<meta property="og:[a-z]+" content="[^"]*"' > tests/fixtures/instagram/post.html
```

Expected: the file contains `og:image`, `og:title` and `og:description` lines. If it is empty, Instagram changed behaviour — stop and report BLOCKED rather than inventing a fixture.

- [ ] **Step 2: Write the failing parser test** — `tests/instagram-og.test.ts`

```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mergePosts, parseOpenGraph, prunePosts, shortcodeOf } from "../scripts/instagram-og.mjs";

const fixture = fs.readFileSync(
  path.join(import.meta.dirname, "fixtures", "instagram", "post.html"),
  "utf8"
);

describe("shortcodeOf", () => {
  it("extracts the shortcode from post and reel URLs, with or without a slash", () => {
    expect(shortcodeOf("https://www.instagram.com/p/Dbqm8pdosiZ/")).toBe("Dbqm8pdosiZ");
    expect(shortcodeOf("https://www.instagram.com/p/Dbqm8pdosiZ")).toBe("Dbqm8pdosiZ");
    expect(shortcodeOf("https://www.instagram.com/reel/ABC123/")).toBe("ABC123");
  });

  it("returns null for a non-post URL", () => {
    expect(shortcodeOf("https://www.instagram.com/esflromania/")).toBeNull();
  });
});

describe("parseOpenGraph", () => {
  it("extracts an image URL from a real post page", () => {
    const got = parseOpenGraph(fixture);
    expect(got).not.toBeNull();
    expect(got.imageUrl).toMatch(/^https:\/\//);
  });

  it("decodes HTML entities in the caption", () => {
    const got = parseOpenGraph(
      '<meta property="og:image" content="https://cdn/x.jpg"><meta property="og:title" content="SFL Romania on Instagram: &quot;Salut&#x21;&quot;">'
    );
    expect(got.caption).toBe('SFL Romania on Instagram: "Salut!"');
  });

  it("reads the posted date out of og:description", () => {
    const got = parseOpenGraph(
      '<meta property="og:image" content="https://cdn/x.jpg"><meta property="og:description" content="49 likes, 1 comments - esflromania on August 5, 2026: &quot;hi&quot;">'
    );
    expect(got.postedAt).toBe("2026-08-05");
  });

  it("returns null when there is no og:image", () => {
    expect(parseOpenGraph("<html><body>login</body></html>")).toBeNull();
  });
});

describe("mergePosts", () => {
  const existing = [
    { url: "https://www.instagram.com/p/AAA/", image: "AAA.jpg", pinned: true },
    { url: "https://www.instagram.com/p/BBB/", image: "BBB.jpg", pinned: false }
  ];

  it("appends only genuinely new URLs", () => {
    const merged = mergePosts(existing, [
      { url: "https://www.instagram.com/p/BBB/", postedAt: "2026-01-01" },
      { url: "https://www.instagram.com/p/CCC/", postedAt: "2026-02-02" }
    ]);
    expect(merged.map((p) => p.url)).toEqual([
      "https://www.instagram.com/p/AAA/",
      "https://www.instagram.com/p/BBB/",
      "https://www.instagram.com/p/CCC/"
    ]);
  });

  it("treats a trailing slash difference as the same post", () => {
    const merged = mergePosts(existing, [{ url: "https://www.instagram.com/p/AAA" }]);
    expect(merged).toHaveLength(2);
  });

  it("never alters existing entries", () => {
    const merged = mergePosts(existing, [{ url: "https://www.instagram.com/p/AAA/", caption: "new" }]);
    expect(merged[0]).toEqual(existing[0]);
  });
});

describe("prunePosts", () => {
  it("keeps pinned entries however old, and trims the rest to the retention count", () => {
    const posts = [
      { url: "https://www.instagram.com/p/P1/", image: "p1.jpg", pinned: true },
      { url: "https://www.instagram.com/p/A/", image: "a.jpg", pinned: false, postedAt: "2026-03-03" },
      { url: "https://www.instagram.com/p/B/", image: "b.jpg", pinned: false, postedAt: "2026-02-02" },
      { url: "https://www.instagram.com/p/C/", image: "c.jpg", pinned: false, postedAt: "2026-01-01" }
    ];
    const { kept, dropped } = prunePosts(posts, 2);
    expect(kept.map((p) => p.image)).toEqual(["p1.jpg", "a.jpg", "b.jpg"]);
    expect(dropped.map((p) => p.image)).toEqual(["c.jpg"]);
  });

  it("drops nothing when under the retention count", () => {
    const posts = [{ url: "https://www.instagram.com/p/A/", image: "a.jpg", pinned: false }];
    expect(prunePosts(posts, 20).dropped).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/instagram-og.test.ts`
Expected: FAIL — cannot resolve `../scripts/instagram-og.mjs`.

- [ ] **Step 4: Implement `scripts/instagram-og.mjs`** (pure functions, no network)

```js
const MONTHS = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12"
};

/** Decodes the named and numeric HTML entities Instagram puts in og:* content. */
function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function metaContent(html, property) {
  const m = html.match(new RegExp(`<meta property="${property}" content="([^"]*)"`));
  return m ? decodeEntities(m[1]) : null;
}

/** "…- esflromania on August 5, 2026: …" -> "2026-08-05" */
function parsePostedAt(description) {
  if (!description) return undefined;
  const m = description.match(/on ([A-Za-z]+) (\d{1,2}), (\d{4})/);
  if (!m) return undefined;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return undefined;
  return `${m[3]}-${month}-${String(m[2]).padStart(2, "0")}`;
}

export function shortcodeOf(url) {
  const m = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

/** Reads the public link-preview metadata. Returns null when there is no image. */
export function parseOpenGraph(html) {
  const imageUrl = metaContent(html, "og:image");
  if (!imageUrl) return null;
  const title = metaContent(html, "og:title");
  const description = metaContent(html, "og:description");
  const caption = (title || "").slice(0, 200) || undefined;
  return { imageUrl, caption, postedAt: parsePostedAt(description) };
}

const key = (url) => shortcodeOf(url) ?? url;

/** Appends incoming posts whose shortcode is not already present. Existing entries are untouched. */
export function mergePosts(existing, incoming) {
  const seen = new Set(existing.map((p) => key(p.url)));
  const added = incoming.filter((p) => !seen.has(key(p.url)));
  return [...existing, ...added];
}

/** Keeps every pinned post plus the newest `retention` unpinned ones. */
export function prunePosts(posts, retention) {
  const pinned = posts.filter((p) => p.pinned);
  const rest = posts
    .filter((p) => !p.pinned)
    .sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));
  const kept = rest.slice(0, retention);
  const dropped = rest.slice(retention);
  const keptSet = new Set([...pinned, ...kept].map((p) => key(p.url)));
  return { kept: posts.filter((p) => keptSet.has(key(p.url))), dropped };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/instagram-og.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 6: Implement `scripts/instagram-fetch.mjs`** (the networked orchestration)

```js
import fs from "node:fs";
import path from "node:path";
import { mergePosts, parseOpenGraph, prunePosts, shortcodeOf } from "./instagram-og.mjs";

const UA = "SFL-Romania-Site/1.0 (+https://sfl-romania.vercel.app)";
const AUTO_FETCH_COUNT = 12;
const RETENTION = 20;
const FILE = path.join(process.cwd(), "content", "instagram.json");
const IMAGES_DIR = path.join(process.cwd(), "content", "instagram", "images");

function readEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      })
  );
}

function readFileJson() {
  if (!fs.existsSync(FILE)) return { posts: [] };
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function writeFileJson(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n");
}

/** Graph API: newest media for the token's own account. Returns [] on any failure. */
async function autoDiscover(token) {
  const url =
    "https://graph.instagram.com/me/media" +
    `?fields=permalink,media_url,thumbnail_url,timestamp,caption,media_type` +
    `&limit=${AUTO_FETCH_COUNT}&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.warn(
      `! Instagram token rejected (HTTP ${res.status}). Auto-discovery skipped; pasted links still work.`
    );
    if (body) console.warn(`  ${body.slice(0, 200)}`);
    return [];
  }
  const json = await res.json();
  return (json.data ?? []).map((m) => ({
    url: String(m.permalink).replace(/\?.*$/, ""),
    remoteImage: m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url,
    postedAt: m.timestamp ? m.timestamp.slice(0, 10) : undefined,
    caption: m.caption ? String(m.caption).slice(0, 200) : undefined,
    pinned: false
  }));
}

/** Public Open Graph metadata for one post. Returns null when unavailable. */
async function resolveViaOpenGraph(postUrl) {
  const res = await fetch(postUrl, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  return parseOpenGraph(await res.text());
}

async function download(imageUrl, destPath) {
  const res = await fetch(imageUrl, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`image download failed: HTTP ${res.status}`);
  fs.writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const token = process.env.INSTAGRAM_TOKEN || readEnvLocal().INSTAGRAM_TOKEN;
  const data = readFileJson();
  let posts = data.posts ?? [];

  if (token) {
    const discovered = await autoDiscover(token);
    const before = posts.length;
    posts = mergePosts(posts, discovered);
    console.log(`✓ auto-discovery: ${posts.length - before} new post(s) from the Instagram API`);
  } else {
    console.log("• no INSTAGRAM_TOKEN — auto-discovery skipped, resolving pasted links only");
  }

  const unresolved = [];
  for (const post of posts) {
    if (post.image && fs.existsSync(path.join(IMAGES_DIR, post.image))) continue;

    const shortcode = shortcodeOf(post.url);
    if (!shortcode) {
      unresolved.push(post.url);
      continue;
    }

    let imageUrl = post.remoteImage;
    if (!imageUrl) {
      const og = await resolveViaOpenGraph(post.url);
      if (!og) {
        unresolved.push(post.url);
        continue;
      }
      imageUrl = og.imageUrl;
      post.caption = post.caption ?? og.caption;
      post.postedAt = post.postedAt ?? og.postedAt;
    }

    const filename = `${shortcode}.jpg`;
    try {
      await download(imageUrl, path.join(IMAGES_DIR, filename));
      post.image = filename;
      console.log(`✓ ${shortcode} — image saved`);
    } catch (e) {
      console.warn(`! ${shortcode} — ${e.message}`);
      unresolved.push(post.url);
    }
    delete post.remoteImage;
  }

  for (const post of posts) delete post.remoteImage;

  const { kept, dropped } = prunePosts(
    posts.filter((p) => p.image),
    RETENTION
  );
  for (const post of dropped) {
    const file = path.join(IMAGES_DIR, post.image);
    if (fs.existsSync(file)) fs.rmSync(file);
  }
  if (dropped.length) console.log(`✓ pruned ${dropped.length} old post(s)`);

  writeFileJson({ posts: kept });
  console.log(`✓ ${kept.length} post(s) in content/instagram.json`);

  if (unresolved.length) {
    console.warn(
      `\n! Could not resolve ${unresolved.length} post(s):\n` +
        unresolved.map((u) => `  ${u}`).join("\n") +
        `\n  Save each image into content/instagram/images/ and set "image" by hand.`
    );
  }
}

main().catch((e) => {
  console.error(`instagram:fetch failed — ${e.message}`);
  process.exit(1);
});
```

- [ ] **Step 7: Add the npm script**

In `package.json` `"scripts"`, add:

```json
"instagram:fetch": "node scripts/instagram-fetch.mjs"
```

- [ ] **Step 8: Run it against the four real posts**

Run: `npm run instagram:fetch`
Expected: prints `• no INSTAGRAM_TOKEN …` then `✓ <shortcode> — image saved` four times and `✓ 4 post(s) in content/instagram.json`. Verify four `.jpg` files exist in `content/instagram/images/` and that `content/instagram.json` now carries `image`, `caption` and `postedAt` for each entry.

If a post fails to resolve, the script names it — save that image by hand rather than changing code.

- [ ] **Step 9: Run the whole suite and commit**

Run: `npm test` — Expected: all suites pass.

```bash
git add scripts/instagram-og.mjs scripts/instagram-fetch.mjs tests/instagram-og.test.ts tests/fixtures/instagram/post.html package.json content/instagram.json content/instagram/images
git commit -m "feat(instagram): curation-time fetch script with token and tokenless paths"
```

---

### Task 3: Sync images into `public/`

**Files:**
- Modify: `scripts/sync-event-images.mjs`

**Interfaces:**
- Consumes: `content/instagram/images/` populated by Task 2.
- Produces: `public/instagram/<file>` served at `/instagram/<file>`, matching the `coverUrl` convention events already use.

- [ ] **Step 1: Extend the sync script**

`scripts/sync-event-images.mjs` currently clears `public/events` and copies each event's `images/`. Add an Instagram pass. Replace the file's trailing `console.log` with the block below, keeping everything above it unchanged:

```js
console.log(`sync-event-images: copied ${count} images to public/events`);

// Instagram tiles use the same "commit the image, serve it locally" approach.
const IG_SRC = path.join(process.cwd(), "content", "instagram", "images");
const IG_DEST = path.join(process.cwd(), "public", "instagram");
fs.rmSync(IG_DEST, { recursive: true, force: true });
let igCount = 0;
if (fs.existsSync(IG_SRC)) {
  fs.mkdirSync(IG_DEST, { recursive: true });
  for (const f of fs.readdirSync(IG_SRC)) {
    fs.copyFileSync(path.join(IG_SRC, f), path.join(IG_DEST, f));
    igCount++;
  }
}
console.log(`sync-event-images: copied ${igCount} images to public/instagram`);
```

- [ ] **Step 2: Add `public/instagram/` to `.gitignore`**

Below the existing `public/events/` line:

```
public/instagram/
```

- [ ] **Step 3: Verify**

Run: `node scripts/sync-event-images.mjs`
Expected: prints both lines; `copied 4 images to public/instagram`.
Run: `git status --short public/` — Expected: no output (both generated folders are ignored).

- [ ] **Step 4: Commit**

```bash
git add scripts/sync-event-images.mjs .gitignore
git commit -m "chore(instagram): sync tile images into public/"
```

---

### Task 4: Section component, translations, home page

**Files:**
- Create: `src/components/InstagramSection.tsx`
- Modify: `messages/ro.json`, `messages/en.json`, `src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `getInstagramPosts()` and `InstagramPost` from `@/lib/instagram`; `siteConfig.social` from `@/site.config`.
- Produces: `<InstagramSection />` — an async server component rendering nothing when there are no posts or no configured Instagram profile.

- [ ] **Step 1: Add the `instagram` namespace to `messages/ro.json`**

Insert after the `"events"` object:

```json
  "instagram": {
    "title": "Urmărește-ne pe Instagram",
    "handle": "@esflromania",
    "cta": "Vezi mai mult pe Instagram",
    "postAlt": "Postare Instagram Students for Liberty România"
  },
```

- [ ] **Step 2: Add the same namespace to `messages/en.json`**

```json
  "instagram": {
    "title": "Follow us on Instagram",
    "handle": "@esflromania",
    "cta": "See more on Instagram",
    "postAlt": "Students for Liberty Romania Instagram post"
  },
```

- [ ] **Step 3: Verify translation parity before writing UI**

Run: `npx vitest run tests/messages.test.ts`
Expected: PASS — both catalogues carry identical keys.

- [ ] **Step 4: Implement `src/components/InstagramSection.tsx`**

```tsx
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { getInstagramPosts } from "@/lib/instagram";
import { siteConfig } from "@/site.config";

export default async function InstagramSection() {
  const profileUrl = siteConfig.social.find((s) => s.name === "Instagram")?.url ?? "";
  const posts = getInstagramPosts();
  if (profileUrl === "" || posts.length === 0) return null;

  const t = await getTranslations("instagram");

  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div className="mb-8 text-center">
        <h2 className="font-display text-3xl font-bold uppercase">{t("title")}</h2>
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block font-display font-bold uppercase text-sfl-gold hover:text-sfl-black"
        >
          {t("handle")}
        </a>
      </div>

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {posts.map((post) => (
          <li key={post.url}>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden border-2 border-sfl-black transition-shadow hover:shadow-[6px_6px_0_0_var(--color-sfl-gold)]"
            >
              <div className="relative aspect-square">
                <Image
                  src={`/instagram/${post.image}`}
                  alt={post.caption ?? t("postAlt")}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-8 text-center">
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-sfl-black px-6 py-3 font-display font-bold uppercase text-sfl-gold transition-colors hover:bg-sfl-gray"
        >
          {t("cta")}
        </a>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Render it on the home page**

In `src/app/[locale]/page.tsx`, add the import beside the other component imports:

```tsx
import InstagramSection from "@/components/InstagramSection";
```

Then place `<InstagramSection />` immediately before the final gold join section — i.e. directly after the closing `</section>` of the dark "Cine suntem" block and before `<section className="bg-sfl-gold py-14">`:

```tsx
      <InstagramSection />

      <section className="bg-sfl-gold py-14">
```

- [ ] **Step 6: Verify**

Run: `npm run lint` — Expected: 0 errors (the `postcss.config.mjs` warning is pre-existing).
Run: `npm test` — Expected: all suites pass.
Run: `npm run build` — Expected: success.

Dev check: start `npm run dev -- -p 3001` in the background, then:
- `curl -s http://localhost:3001/ | grep -c "/instagram/"` → expect 4
- `curl -s http://localhost:3001/ | grep -o "Urmărește-ne pe Instagram"` → expect a match
- `curl -s http://localhost:3001/en | grep -o "Follow us on Instagram"` → expect a match

Stop the dev server afterwards.

- [ ] **Step 7: Commit**

```bash
git add src/components/InstagramSection.tsx src/app/[locale]/page.tsx messages/ro.json messages/en.json
git commit -m "feat(instagram): home page section with curated post tiles"
```

---

### Task 5: Documentation

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: the finished workflow.
- Produces: bilingual instructions for both curation paths.

- [ ] **Step 1: Add a bilingual section to `README.md`**

Insert after the "Cum adaugi un membru în echipă / How to add a team member" section:

```markdown
## Cum adaugi postări Instagram / How to add Instagram posts

Postările afișate pe pagina principală sunt listate în `content/instagram.json`.
Imaginile sunt descărcate o singură dată și salvate în repository — site-ul publicat
nu contactează niciodată Instagram. / The posts shown on the home page are listed in
`content/instagram.json`. Images are downloaded once and committed — the published
site never calls Instagram.

### Varianta simplă, fără cont de dezvoltator / The simple way, no developer account

1. În aplicația Instagram: postare → Share → Copy link.
   / In the Instagram app: post → Share → Copy link.
2. Adaugă linkul în `content/instagram.json`:
   / Add the link to `content/instagram.json`:

   { "url": "https://www.instagram.com/p/XXXXXXXX/" }

3. `npm run instagram:fetch` — descarcă imaginea și descrierea.
   / downloads the image and caption.
4. `git add . && git commit && git push` — Vercel publică automat.
   / Vercel deploys automatically.

Adaugă `"pinned": true` unei postări ca să rămână afișată chiar dacă apar altele
mai noi. / Add `"pinned": true` to a post to keep it from being rotated out by
newer ones.

### Varianta automată, cu token / The automatic way, with a token

Necesită un cont Instagram de tip Creator sau Business (conturile personale nu au
acces la API). / Requires a Creator or Business Instagram account (personal
accounts have no API access).

1. Instagram → Settings → Account type → switch to Creator.
2. developers.facebook.com → creează o aplicație → adaugă produsul Instagram →
   generează un token de lungă durată. / create an app → add the Instagram
   product → generate a long-lived token.
3. Creează `.env.local` (nu se urcă în git / never committed):

   INSTAGRAM_TOKEN=...

4. `npm run instagram:fetch` — aduce automat cele mai noi postări.
   / automatically pulls the newest posts.

Tokenul expiră după ~60 de zile. Expirarea NU afectează site-ul publicat — doar
scriptul îți va cere un token nou. / The token expires after ~60 days. Expiry does
NOT affect the live site — only the script will ask for a fresh token.
```

- [ ] **Step 2: Verify the README has no zero-width characters**

Run: `grep -P '[\x{200B}-\x{200D}\x{FEFF}]' README.md`
Expected: no output.

- [ ] **Step 3: Full gate**

Run: `npm run check`
Expected: lint 0 errors, all tests pass, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: how to add Instagram posts, with and without a token"
```

---

## Self-Review

**Spec coverage:** content model → Task 1; dual-source fetch script with pinning, prune and manual fallback → Task 2; image sync → Task 3; placement, tile design, i18n, empty state → Task 4; bilingual docs → Task 5. Validation, ordering, display limit and caption/alt behaviour are all covered by tests in Tasks 1, 2 and 4.

**Interface consistency:** `InstagramPost` fields (`url`, `image`, `pinned`, `postedAt`, `caption`) are identical across the loader (Task 1), the script (Task 2) and the component (Task 4). `INSTAGRAM_DISPLAY_LIMIT` is defined once in Task 1 and only referenced elsewhere. Image URLs are `/instagram/<file>`, matching the sync destination in Task 3.

**Known deviation from the spec:** the spec describes tests for merge and prune logic "as pure functions" — they live in `scripts/instagram-og.mjs` rather than `src/lib/`, because they are curation-time concerns the app must never import. The app-facing loader stays in `src/lib/instagram.ts`.
