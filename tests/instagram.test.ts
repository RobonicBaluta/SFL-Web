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
