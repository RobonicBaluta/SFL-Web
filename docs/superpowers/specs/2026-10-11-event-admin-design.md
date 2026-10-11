# Event Admin Page — Design

**Date:** 2026-10-11
**Status:** Approach and architecture approved in brainstorming ("okay, sounds good, build that"). The form and safety-net sections use the defaults proposed in chat and were not reviewed separately.
**Site:** SFL România (Next.js 15, next-intl, file-based content, deployed on Vercel)

## Purpose

Let the site owner add, edit and delete events, and add photos after an event, from a phone or a computer, without asking a developer. The site stays file-based: the admin page writes the same files a developer would write by hand, and the existing build validates and publishes them.

## Decisions made with the user

| Decision | Choice |
|---|---|
| Who uses it | Only the owner: one password, no accounts |
| Languages | The owner types the Romanian AND English text; no machine translation |
| Scope | Create, edit, add/remove photos, delete |
| Where data goes | Commits to GitHub `main`; Vercel redeploys (live in ~1–2 min) |
| Rejected | Ready-made Git CMS (GitHub login, different file layout); database (rewrites how the site loads events and loses build-time validation) |
| Admin UI language | English (not public, so exempt from the RO/EN messages rule) |

## Architecture

```
browser ──/admin pages (server components, read)──┐
        ──/api/admin/* (route handlers, write)────┼── src/lib/admin/github.ts ── GitHub API
                                                   │        (the token never leaves the server)
                                                   └── src/lib/admin/* pure logic (tested)
GitHub main ──push──▶ Vercel build (prebuild tests incl. MDX compile) ──▶ live site
```

- **Routes.** `/admin` (login or event list), `/admin/new` and `/admin/edit/[slug]`. They live outside `[locale]` with their own root layout, and the i18n middleware matcher excludes `admin`. `robots.txt` disallows `/admin` and `/api/admin`, and the pages carry `noindex`.
- **Reading** uses one GitHub GraphQL query that returns every event folder's `event.json`, `ro.mdx`, `en.mdx` and image filenames. The editor therefore sees a save immediately, before the deploy finishes.
- **Writing** uses the Git Data API: get head → get its tree → create a tree on top of it (text files inline, photos by blob SHA, deletions as `sha: null`) → create a commit → move `main`. If the ref update is rejected as non-fast-forward (a concurrent push), the save retries from the new head, up to 3 times. One save makes one commit, with the message `admin: add|update|delete event "<title>"`.
- **Photos** are resized in the browser (longest side 2400 px, JPEG quality 0.85, retried at 0.7 if still over 3.5 MB). They are uploaded one per request to `POST /api/admin/photo`, which creates a GitHub blob and returns its SHA, and Save then references the SHAs. This keeps every request under Vercel's 4.5 MB body limit and works on mobile data.
- **Deploy status.** After a save, the page polls `GET /api/admin/deploy?sha=`, which reads GitHub's combined commit status (Vercel reports there): *Waiting → Publishing → Live ✓ / Build failed*. A failed build leaves the previous version live.

## Configuration (Vercel → Settings → Environment Variables)

- `ADMIN_PASSWORD`: at least 12 characters. Shorter values are refused with a message.
- `GITHUB_TOKEN`: a fine-grained token limited to `RobonicBaluta/SFL-Web`, with *Contents: Read and write* and *Commit statuses: Read-only*.
- The repository owner, name and branch live in `src/site.config.ts` (they are not secret). `GITHUB_API_URL` optionally overrides `https://api.github.com`; it is used only for local testing against a fake server.

If either secret is missing, `/admin` says which one instead of failing.

## Security

- **Session:** cookie `sfl_admin` = `<expiresAt>.<HMAC-SHA256(key = ADMIN_PASSWORD, "sfl-admin:" + expiresAt)>`. It is httpOnly, `SameSite=Strict`, `Secure` in production, and lasts 30 days. Changing the password invalidates every session.
- **Login:** constant-time comparison of SHA-256 digests. A wrong password waits 1 s before the answer.
- **CSRF:** every mutating route requires a valid session AND an `Origin` header that matches the request host.
- **Paths:** slugs must match `^\d{4}-\d{2}-[a-z0-9-]+$` and photo names `^[a-z0-9][a-z0-9-]*\.jpg$`. Every path is built on the server under `content/events/<slug>/`. An upload must start with the JPEG magic bytes and be at most 4 MB.
- **Text:** user text cannot inject MDX/JSX (see below). Length limits apply: title 200, summary 400, body 20 000, 200 per name, 30 names per list, 40 photos per event.

## Event text and MDX

Event bodies are compiled as MDX at build time. Measured with `@mdx-js/mdx` 3.1.1, each of these fails compilation: `{`, `}`, `<`, an HTML comment, and a line starting with lowercase `import` or `export`. Backslash escapes (`\{`, `\<`) do **not** help, but character references do. So:

- **On save** the body is encoded: `{` → `&#123;`, `}` → `&#125;`, `<` → `&lt;`, and `import`/`export` at a line start → `&#105;mport`/`&#101;xport`.
- **On load** exactly those references are decoded, so the owner always edits plain text.
- **Before committing** both bodies are compiled with `@mdx-js/mdx`. A failure is shown in the form and nothing is committed.
- Markdown still works: `**bold**`, `[text](https://…)`, lines starting with `- ` for lists, and a blank line between paragraphs. The form shows this hint.
- A new content test compiles every event's MDX, so hand-written events are covered too.

## The form

The sections are a single column on a phone:

1. **Basics:** Date, End date (optional), and the event's web address (slug). The slug is auto-filled as `YYYY-MM-<romanian-title>` while creating and can be edited then. After creation it is fixed, because it is the public URL.
2. **Text:** Title, Short summary (shown on event cards) and Text, once for Romanian and once for English.
3. **Place:** City and Venue, each in RO and EN. An empty EN field copies RO; if both are empty, the field is left out.
4. **People:** Speakers, Moderators, Partners and Sponsors, one name per line.
5. **Tags:** checkboxes for the tags defined under `tags` in `messages/*.json`. New tags still need a developer, because they need translations.
6. **External:** "Organized by another group" (shows the *Extern/External* badge).
7. **Photos:** thumbnails, *Add photos* (multiple at once), remove (×) and *Use as cover*. The gallery order stays alphabetical by filename, as the site does today. A new photo is named after its original filename, sanitized, with `.jpg`, and de-duplicated with `-2`, `-3`.
8. **Cover framing:** click the cover where the important part is, which sets `coverPosition` to `X% Y%`. Live previews show the event card (16:9) and the event page header (21:9).
9. **Save:** disabled while photos upload. Server errors are shown next to the button. In create mode, a successful save opens the edit page with the deploy status.
10. **Delete** (edit mode only): a two-step confirmation. It removes the whole `content/events/<slug>/` folder in one commit.

The event list at `/admin` shows upcoming and past events (title, date, photo count, *Edit*, *View on site*), a *New event* button and *Log out*.

## Code layout

- `src/lib/admin/session.ts`: create and verify session tokens, and check the password (Node crypto; pure and tested).
- `src/lib/admin/text.ts`: MDX-safe encode/decode (no Node imports, so client and server can both use it).
- `src/lib/admin/naming.ts`: slugify and photo file naming (no Node imports).
- `src/lib/admin/draft.ts`: the `EventDraft` type and the files ↔ draft conversion (server only, because it uses `gray-matter`; client components import only its types).
- `src/lib/admin/validate.ts`: server-side validation with `eventMetaSchema`, the known tags and an MDX compile (server only).
- `src/lib/admin/github.ts`: GraphQL read, blob upload, commit with retry, deploy status (`fetch` is injected for tests).
- `src/lib/admin/auth.ts`: Next.js glue: env config, cookie, `requireAdmin` and the same-origin check.
- `src/app/admin/**`: layout, pages, client components (`_components/`) and browser photo resizing.
- `src/app/api/admin/{login,logout,photo,save,delete,deploy}/route.ts`.

## Testing

- **Unit (Vitest, Node):**
  - session: valid, expired, tampered, wrong password, short password
  - text: encode/decode round trip, and *encoded text compiles*
  - naming
  - draft ↔ files round trip over **every real event**
  - validation errors
  - GitHub client against a fake `fetch`: call sequence, deletions, retry on non-fast-forward, and error messages for 401/403/404
- **Content:** every event's RO and EN body compiles as MDX.
- **Manual end-to-end:** the dev server pointed at a local fake GitHub API (`GITHUB_API_URL`), covering login, list, create with photos, edit, delete and deploy status. A check against the real GitHub happens on first use, after the owner sets the token.

## Out of scope

Drafts or previews, multiple users, renaming an event's URL, reordering photos, new tags, and editing the team or Instagram lists.
