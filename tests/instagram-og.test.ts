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

  it("handles the account-prefixed permalink Instagram returns in og:url", () => {
    expect(shortcodeOf("https://www.instagram.com/esflromania/p/Dbqm8pdosiZ/")).toBe("Dbqm8pdosiZ");
  });

  it("returns null for a non-post URL", () => {
    expect(shortcodeOf("https://www.instagram.com/esflromania/")).toBeNull();
  });
});

describe("parseOpenGraph", () => {
  it("extracts an image URL from a real post page", () => {
    const got = parseOpenGraph(fixture);
    expect(got).not.toBeNull();
    expect(got!.imageUrl).toMatch(/^https:\/\//);
  });

  it("reads caption and date from the real fixture", () => {
    const got = parseOpenGraph(fixture)!;
    expect(got.caption).toContain("What are your thoughts on this?");
    expect(got.postedAt).toBe("2026-08-05");
  });

  it("strips the 'X on Instagram:' framing and collapses newlines", () => {
    const got = parseOpenGraph(
      '<meta property="og:image" content="https://cdn/x.jpg"><meta property="og:title" content="SFL Romania on Instagram: &quot;Linia unu\n\nlinia doi&quot;">'
    )!;
    expect(got.caption).toBe("Linia unu linia doi");
  });

  it("decodes HTML entities including emoji", () => {
    const got = parseOpenGraph(
      '<meta property="og:image" content="https://cdn/x.jpg"><meta property="og:title" content="SFL Romania on Instagram: &quot;Salut&#x21; &#x1f914;&quot;">'
    )!;
    expect(got.caption).toBe("Salut! 🤔");
  });

  it("reads the posted date out of og:description", () => {
    const got = parseOpenGraph(
      '<meta property="og:image" content="https://cdn/x.jpg"><meta property="og:description" content="49 likes, 1 comments - esflromania on August 5, 2026: &quot;hi&quot;">'
    )!;
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
    const merged = mergePosts(existing, [
      { url: "https://www.instagram.com/p/AAA/", caption: "new" }
    ]);
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
