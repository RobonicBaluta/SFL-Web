import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
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
    "?fields=permalink,media_url,thumbnail_url,timestamp,caption,media_type" +
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
    caption: m.caption ? String(m.caption).replace(/\s+/g, " ").trim().slice(0, 200) : undefined,
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
  }

  for (const post of posts) delete post.remoteImage;

  // Record each image's natural size so tiles render in the post's own shape
  // instead of being cropped to a square. Backfills entries fetched earlier.
  for (const post of posts) {
    if (!post.image || (post.width && post.height)) continue;
    const file = path.join(IMAGES_DIR, post.image);
    if (!fs.existsSync(file)) continue;
    try {
      const { width, height } = await sharp(file).metadata();
      post.width = width;
      post.height = height;
    } catch (e) {
      console.warn(`! ${post.image} — could not read dimensions: ${e.message}`);
    }
  }

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
