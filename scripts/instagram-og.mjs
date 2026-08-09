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

/** Instagram caption content spans newlines, so this must not be line-anchored. */
function metaContent(html, property) {
  const m = html.match(new RegExp(`<meta property="${property}" content="([^"]*)"`, "s"));
  return m ? decodeEntities(m[1]) : null;
}

/**
 * og:title reads `SFL Romania on Instagram: "the caption"`. Strip that framing so the
 * caption can serve as an image's accessible name, and collapse the newlines captions carry.
 */
function cleanCaption(title) {
  if (!title) return undefined;
  const withoutPrefix = title.replace(/^.*? on Instagram:\s*/s, "");
  const unquoted = withoutPrefix.replace(/^"/, "").replace(/"$/, "");
  const collapsed = unquoted.replace(/\s+/g, " ").trim();
  return collapsed === "" ? undefined : collapsed.slice(0, 200);
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
  const m = url.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

/** Reads the public link-preview metadata. Returns null when there is no image. */
export function parseOpenGraph(html) {
  const imageUrl = metaContent(html, "og:image");
  if (!imageUrl) return null;
  return {
    imageUrl,
    caption: cleanCaption(metaContent(html, "og:title")),
    postedAt: parsePostedAt(metaContent(html, "og:description"))
  };
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
