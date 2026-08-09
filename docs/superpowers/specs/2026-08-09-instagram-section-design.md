# Instagram Section — Design

**Date:** 2026-08-09
**Status:** Approved by user (both sections approved in brainstorming)
**Site:** SFL România (Next.js 15, next-intl, file-based content)

## Purpose

Show recent Students for Liberty România Instagram activity on the home page as social proof, immediately before the "Alătură-te mișcării" call to action, without making the public site depend on Meta at runtime.

## Decisions made with the user

| Decision | Choice |
|---|---|
| Feed type | Curated list, not a live third-party widget |
| Rendering | Our own on-brand tiles (not Meta's embed script) |
| Placement | Home page, between the "Cine suntem" strip and the gold join CTA |
| Image sourcing | Fetched once at curation time by a script, committed to the repo |
| Auto vs manual | **Both** — Graph API token when available, pasted post URLs as fallback |
| Account/API reality | Instagram Basic Display API deprecated 2024-12-04; profile pages are login-walled; tokenless oEmbed resolves individual public posts only |

## Why no runtime dependency on Meta

The built site serves local images and plain links. It never calls Instagram at request time or at build time. This buys:

- **No cookie-consent obligation** — Meta's `embed.js` sets tracking cookies; we load none, so the site needs no consent banner for this feature.
- **No silent breakage** — a deprecated endpoint, an expired token, a deleted post, or a Meta outage cannot blank the section or fail a deploy.
- **Portability** — behaves identically on Vercel and on the future self-hosted server.
- **Speed** — local optimized images instead of third-party iframes.

The cost is that new posts appear only when someone runs the fetch script and commits. That is acceptable: this is a curated highlights strip, not a live mirror.

## Content model

`content/instagram.json` — the single source of truth for what renders:

```json
{
  "posts": [
    {
      "url": "https://www.instagram.com/p/ABC123/",
      "image": "ABC123.jpg",
      "pinned": true
    },
    {
      "url": "https://www.instagram.com/p/XYZ789/",
      "image": "XYZ789.jpg",
      "postedAt": "2026-08-01"
    }
  ]
}
```

Fields:

- `url` (required) — canonical post permalink, `https://www.instagram.com/p/<shortcode>/` or `/reel/<shortcode>/`.
- `image` (required once fetched) — filename inside `content/instagram/images/`.
- `pinned` (optional, default `false`) — protects the entry from being rotated out by an auto-sync.
- `postedAt` (optional, ISO date) — recorded for auto-fetched posts; used for ordering.

Ordering: pinned entries first in file order, then the rest newest-first by `postedAt`, falling back to file order when absent. Only the first `DISPLAY_LIMIT` (4) render on the page.

Images live in `content/instagram/images/` and are copied to `public/instagram/` by the existing image-sync mechanism, mirroring how event images already work.

## The fetch script — `npm run instagram:fetch`

One command, two input paths, one output shape. It is a **curation-time tool run by a human**, never part of `next build`.

1. **Auto-sync (only if `INSTAGRAM_TOKEN` is set in `.env.local`)**
   Calls the Instagram Graph API for the account's recent media, takes the newest `AUTO_FETCH_COUNT` (12) items, and appends any whose `url` is not already in the list, recording `postedAt`.
   If the token is missing, expired, or rejected, the script prints a clear, actionable notice and **continues** to step 2 rather than failing.

2. **Resolve missing images (always)**
   For every entry lacking a local `image`, resolves the post through Meta's tokenless oEmbed endpoint (`graph.facebook.com/instagram_oembed`), downloads the thumbnail into `content/instagram/images/`, and writes the filename back into the JSON. Entries that already have a downloaded image are skipped, so re-running is cheap and idempotent.
   If oEmbed returns no usable thumbnail for a post, the script reports that post by URL and instructs the user to drop an image into `content/instagram/images/` and set `image` manually. This is the documented manual escape hatch; it requires no code change.

3. **Prune (auto entries only)**
   Non-pinned entries beyond a retention count (20) are dropped from the JSON and their images deleted, keeping the repo from growing without bound. Pinned and manually added entries are never pruned automatically.

The script exits non-zero only on a genuine failure to write files. A missing token, an unresolvable post, or an empty account are warnings, not errors.

**Token handling:** `INSTAGRAM_TOKEN` is read from `.env.local`, which is git-ignored. The token is never committed, never referenced by application code, and never configured on Vercel. Losing or expiring it degrades the workflow to the manual path only.

## Validation

Zod-validated when the site builds, following the events pattern:

- `url` must match the Instagram post/reel permalink shape.
- `image` must be present and must exist in `content/instagram/images/`.
- Errors name the offending file and field, e.g. `instagram.json: posts[2].image "foo.jpg" not found in content/instagram/images/`.

A malformed list fails the build loudly rather than shipping a broken tile.

## Page design

**Placement:** home page only, as the last content section before the gold join CTA. This preserves the page's alternating colour rhythm (gold hero → black next-event → white events → black "Cine suntem" → **white Instagram** → gold join → black footer) and puts recent activity directly before the sign-up ask.

**Layout:** full-width white band. Heading `URMĂREȘTE-NE PE INSTAGRAM` in the display font, uppercase, with the handle `@esflromania` beneath it in gold. Below, a grid of square tiles — 4 columns from `md` up, 2 columns below — each tile reusing the established card treatment: 2px black border, gold offset shadow and slight image zoom on hover. Tiles link to the post with `target="_blank" rel="noopener noreferrer"`. The section closes with a `VEZI MAI MULT PE INSTAGRAM` button in the existing black-on-gold style, linking to `siteConfig.social` Instagram entry.

**Empty state:** if the list is empty or the file is absent, the entire section does not render. No placeholder, no gap.

**Handle source:** the profile link comes from the existing `siteConfig.social` Instagram entry, so it is configured in exactly one place. If that entry is empty, the section does not render.

## i18n

A new `instagram` namespace in `messages/ro.json` and `messages/en.json`, covering the heading, the handle label, the CTA button, and the tile alt text (e.g. "Postare Instagram Students for Liberty România" / "Students for Liberty Romania Instagram post"). No hardcoded user-facing strings, enforced by the existing `react/jsx-no-literals` rule and the message key-parity test.

## Testing

- Schema validation: valid list parses; malformed URL, missing `image`, and image-not-on-disk each fail naming file and field.
- Ordering: pinned entries precede unpinned; unpinned sort newest-first by `postedAt`; entries without `postedAt` keep file order.
- Display limit: only the first 4 entries render.
- Merge logic: auto-sync appends only genuinely new URLs and never duplicates or reorders pinned entries.
- Prune logic: pinned and manual entries survive; non-pinned auto entries beyond the retention count are removed.
- Translation parity: `instagram` namespace keys exist in both locales (covered by the existing parity test).
- Empty list renders no section.

Script network behaviour is not unit-tested against the live API; the merge, ordering, prune and validation logic are pure functions tested directly, with network I/O kept in a thin, separately-invoked layer.

## Documentation

The bilingual README gains an "Adaugă postări Instagram / Add Instagram posts" section covering both paths: the one-time Creator-account + Meta-app setup for the token, and the paste-a-link fallback that needs no credentials. It states explicitly that the token lives only in `.env.local` and that an expired token never affects the live site.

## Out of scope (YAGNI)

- No live/auto-refreshing feed on the deployed site.
- No Meta embed script, no cookie banner, no third-party widget service.
- No captions, like counts, or comment display — tiles are images that link out.
- No Instagram section on other pages; home only.
- No automatic token refresh; the README documents manual renewal.

## Known constraints, stated plainly

- Fetching an account's latest posts **requires** the account to be Creator or Business and a Meta app token. Personal accounts have no API access. This one-time setup is the account owner's to perform.
- Long-lived tokens expire in roughly 60 days. Because the token is used only at curation time, expiry never affects the deployed site.
- Tokenless oEmbed serves public posts only and may be rate-limited; it is used only for posts added by hand.
- Whether oEmbed returns a usable thumbnail for a given post must be confirmed against a real SFL România post before implementation. If it does not, the manual-image path documented above is the fallback and no design change is required.
