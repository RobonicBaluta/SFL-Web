# SFL Romania Website — Design

**Date:** 2026-07-30
**Status:** Approved by user (sections 1 & 2 approved in brainstorming session)

## Purpose

Public website for Students for Liberty România: present the organization, showcase its events in a blog style, and make it trivial for the (git-savvy) team to add future and past events. Romanian is the default language; English is fully supported from day one.

## Decisions made with the user

| Decision | Choice |
|---|---|
| Event editing workflow | Git-based: MDX/JSON files in the repo, folder-copy template |
| Events separation | Upcoming vs Past (auto-computed from date), tags as secondary grouping |
| Pages | Acasă, Evenimente, Despre noi, Implică-te |
| Join/contact | Links to external signup form + social links (placeholder URLs in one config file) |
| Stack | Next.js 15 (App Router) + next-intl + Tailwind CSS + MDX |
| Liberty Road Romania | Each of the 4 stops is its own event post, tagged "Liberty Road Romania 2026" |
| Event folder → date mapping | Confirmed by user (years inferred: Dec 2025 for Revoluția; 2026 for all others) |

## Architecture

- **Framework:** Next.js 15, App Router, TypeScript, statically generated pages (`generateStaticParams` over locales × events). No Vercel-only APIs anywhere.
- **Styling:** Tailwind CSS with SFL brand tokens.
- **i18n:** `next-intl` with locale prefix routing — `/` (Romanian, default, unprefixed) and `/en/...` (English). Language switcher in navbar preserves the current page. `hreflang` alternates and per-locale metadata for SEO.
- **Content:** file-based, no database, no CMS.

### Repo layout

```
/ (repo root = c:\claude\SFL Web)
├── content/
│   ├── source/                     # existing raw material (docx, original folders) — kept for reference
│   └── events/
│       ├── _TEMPLATE/              # copy to add an event
│       │   ├── event.json
│       │   ├── ro.mdx
│       │   ├── en.mdx
│       │   └── images/
│       ├── 2025-12-revolutia-cauze-si-eveniment-istoric/
│       ├── 2026-02-john-galt-school/
│       ├── 2026-03-comunismul-rememorat-studentilor/
│       ├── 2026-04-libertycon-madrid/
│       ├── 2026-04-lrr-bucuresti/
│       ├── 2026-05-lrr-cluj-napoca/
│       ├── 2026-05-lrr-iasi/
│       ├── 2026-05-lrr-chisinau/
│       └── 2026-07-securitatea-marii-negre-constanta/
├── messages/
│   ├── ro.json                     # ALL UI strings, Romanian
│   └── en.json                     # ALL UI strings, English
├── public/images/                  # logo, RO chapter logo, hero/brand imagery
├── site.config.ts                  # signup form URL, social links, contact email
├── src/
│   ├── app/[locale]/               # pages (see Pages)
│   ├── components/
│   └── lib/events.ts               # event loading, validation, sorting
└── docs/superpowers/specs/         # this document
```

### Event content model

`event.json` (validated at build time with a schema — zod):

- `slug` (string, matches folder)
- `date` (ISO date), optional `endDate` for multi-day events/programs
- `city`, `venue` (venue optional for external events)
- `speakers[]`, `moderators[]`, `partners[]`, `sponsors[]` (all optional string arrays)
- `tags[]` (e.g. `"Liberty Road Romania 2026"`, `"conferință"`, `"program educațional"`)
- `cover` (filename inside `images/` used as card thumbnail)
- `external` (boolean, default false — e.g. LibertyCon Madrid)

`ro.mdx` / `en.mdx`: frontmatter `title` + body text. Both files required — a translation-completeness check fails the build if one is missing. Source texts already exist in both languages in `SFL_Romania_Descrieri_Evenimente.docx`.

**Upcoming vs Past is computed:** `date >= today` (or `endDate >= today`) → upcoming; otherwise past, sorted newest-first. Nothing to edit when an event passes.

### Adding an event (README workflow, documented in RO + EN)

1. Copy `content/events/_TEMPLATE` → rename to `YYYY-MM-slug`.
2. Fill `event.json`, write `ro.mdx` and `en.mdx`.
3. Drop photos into `images/`, set `cover`.
4. Commit + push → Vercel auto-deploys. Build fails loudly on invalid data.

## Visual design

Derived from studentsforliberty.org and provided brand assets:

- **Colors:** SFL gold `#FFC627` (primary accent), near-black `#1A1A1A` (nav, footer, headings), white surfaces. High-contrast, bold.
- **Typography:** Oswald (bold condensed uppercase) for display/headings — matches SFL global's look; Inter for body. Both via `next/font` (self-hosted, works when self-hosting).
- **Buttons:** uppercase bold, black-on-gold / gold-on-black, matching SFL global CTAs.
- **Imagery:** event photos from `content/`; RO-flag chapter logo (navbar/favicon); gold "A Freer Future" flag for hero/OG cards; a few generic images from SFL global where useful (hero collage style).

## Pages

All under `/[locale]/`; RO at `/`, EN at `/en/`.

1. **Acasă** — gold/dark hero with tagline; "next upcoming event" banner (hidden when none); latest 3 events as cards; short "cine suntem" teaser linking to Despre noi; join CTA strip linking to Implică-te.
2. **Evenimente** — tabs *Viitoare* / *Trecute*; blog-style card grid (cover photo, date badge, city, title, excerpt, tags); tag filter. **Event detail:** hero image, info box (date, venue, speakers, moderators, partners, sponsors), MDX body, photo gallery with lightbox.
3. **Despre noi** — mission, SFL Global affiliation, values; team section driven by `team.json` (name, role, photo optional) for easy additions.
4. **Implică-te** — join CTA (external signup URL from `site.config.ts`), member benefits, contact email, social links.

Shared: navbar (logo, 4 menu items, RO/EN switcher), footer (logo, menu, social, SFL Global link, contact).

## i18n — the 100% rule

- Every user-facing UI string comes from `messages/ro.json` / `messages/en.json` via `next-intl`. Zero hardcoded literals in components.
- Event/team content: per-locale MDX / localized JSON fields.
- Locale-aware date formatting ("13 decembrie 2025" / "December 13, 2025").
- Enforcement: an automated check fails CI if (a) message key sets differ between locales, (b) any event lacks `ro.mdx` or `en.mdx`, (c) components contain literal user-facing strings (lint rule).

## Error handling

- Build-time zod validation of every `event.json` — clear error naming file and field.
- Missing translation file or mismatched message keys → build failure, not silent fallback.
- Missing `cover`/image reference → build failure.
- 404 page localized like every other page.

## Deployment

1. **Now:** Vercel — repo connected, auto-deploy on push to main, preview deploys on branches. No env vars required.
2. **Later (own server):** `next build && next start` behind nginx, or the included Dockerfile. Fonts self-hosted via `next/font`; images served by Next image optimizer (works self-hosted).

## Testing

- Unit tests: event loading/sorting (upcoming/past boundary, endDate handling, newest-first order), config loading.
- Translation-completeness test: `ro.json`/`en.json` key parity; every event has both MDX files.
- Schema validation test for all real event folders.
- Build succeeds = pages render for all locale × event combinations (static generation acts as a smoke test).

## Out of scope (YAGNI)

- No CMS, no database, no auth.
- No built-in contact/signup form (external link instead).
- No newsletter integration (can be added later as a link).
- No per-event registration/RSVP.
