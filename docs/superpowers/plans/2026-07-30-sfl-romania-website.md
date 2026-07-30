# SFL Romania Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Students for Liberty România public website: blog-style events (upcoming/past, tag filters), 4 pages, full RO/EN i18n, file-based event content, deployable to Vercel now and own server later.

**Architecture:** Next.js 15 App Router with static generation + hourly ISR. All content is file-based (`content/events/*` folders with `event.json` + per-locale MDX + images; `content/team.json`). `next-intl` provides locale routing (RO unprefixed at `/`, EN at `/en` with localized path segments). A prebuild script syncs event images into `public/events/`. Zod validates all content at build time; vitest tests run inside `prebuild` so a broken event or missing translation fails every deploy.

**Tech Stack:** Next.js ^15.5, React ^19, TypeScript (strict), next-intl ^4, Tailwind CSS ^4, zod ^4, gray-matter, next-mdx-remote ^5 (`/rsc`), yet-another-react-lightbox ^3, sharp, vitest ^3, ESLint 9 (flat config).

**Spec:** `docs/superpowers/specs/2026-07-30-sfl-romania-website-design.md`

## Global Constraints

- Locales: `ro` (default, unprefixed at `/`) and `en` (at `/en`), localized pathnames: `/evenimente`↔`/en/events`, `/despre-noi`↔`/en/about`, `/implica-te`↔`/en/get-involved`.
- **100% i18n rule:** zero literal user-facing strings in JSX. All UI text from `messages/ro.json` / `messages/en.json`. Enforced by ESLint `react/jsx-no-literals` (allowed exceptions: `"RO"`, `"EN"`, `"•"`, `"–"`, `"|"`, `"©"`). Proper nouns inside content data (names of people, institutions, partner orgs) are data, not UI strings — they are exempt.
- Brand: gold `#FFC627` (`sfl-gold`), near-black `#1A1A1A` (`sfl-black`), gray `#4B4B4B` (`sfl-gray`); display font Oswald (weights 500/600/700), body font Inter — both via `next/font/google` with `subsets: ["latin", "latin-ext"]` (Romanian diacritics require `latin-ext`).
- No Vercel-only APIs. `output: "standalone"` in next.config. No database, no CMS, no auth.
- Every page/layout calls `setRequestLocale(locale)` before using translations (required for static rendering with next-intl).
- Package manager: npm. Node >= 20. Dev machine is Windows — use the Bash tool (Git Bash) for shell steps; all scripts must be cross-platform (`node:path`, no shell-isms in package.json beyond `&&`).
- Conventional commits; commit at the end of every task.
- `_`-prefixed folders in `content/events/` are ignored by the loader (used for `_TEMPLATE`).
- Repo root is the project root (contains `content/`, `docs/`, `src/`, `package.json`).
- Deviation from spec noted and accepted: `site.config.ts` lives at `src/site.config.ts` (imported as `@/site.config`) so it participates in the TS path alias.

## File Map (who owns what)

| Path | Responsibility | Task |
|---|---|---|
| `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.gitignore`, `src/app/globals.css`, `src/app/fonts.ts`, `scripts/sync-event-images.mjs` | Scaffold, tooling, brand tokens, lint enforcement, image sync | 1 |
| `messages/ro.json`, `messages/en.json`, `src/i18n/{routing,request,navigation}.ts`, `src/middleware.ts`, `src/app/[locale]/layout.tsx`, `vitest.config.ts`, `tests/messages.test.ts` | i18n foundation + key-parity test | 2 |
| `src/lib/events.ts`, `src/lib/dates.ts`, `content/events/_TEMPLATE/*`, `tests/events.test.ts`, `tests/dates.test.ts`, `tests/fixtures/**` | Event model, loader, upcoming/past split, date formatting | 3 |
| `content/events/<9 slugs>/*`, `content/source/*`, `public/images/{sfl-flag.jpg,sfl-romania-logo.png}`, `tests/content.test.ts` | Real content migration + validation of real content | 4 |
| `src/site.config.ts`, `src/components/{Navbar,LocaleSwitcher,Footer}.tsx` | Site shell | 5 |
| `src/components/{EventCard,EventsExplorer}.tsx`, `src/lib/cards.ts`, `src/lib/seo.ts`, `src/app/[locale]/evenimente/page.tsx` | Events listing | 6 |
| `src/app/[locale]/evenimente/[slug]/page.tsx`, `src/components/{EventInfo,Gallery}.tsx` | Event detail + gallery | 7 |
| `src/app/[locale]/page.tsx` | Home page | 8 |
| `src/lib/team.ts`, `content/team.json`, `tests/team.test.ts`, `src/app/[locale]/despre-noi/page.tsx`, `src/app/[locale]/implica-te/page.tsx`, `public/images/global/*` | About + Get involved | 9 |
| `src/app/[locale]/[...rest]/page.tsx`, `src/app/[locale]/not-found.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts` | 404 + SEO extras | 10 |
| `README.md`, `Dockerfile`, `.dockerignore` | Docs + deployment | 11 |

---

### Task 1: Project scaffold & tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.gitignore`, `src/app/globals.css`, `src/app/fonts.ts`, `src/app/layout.tsx` (temporary), `src/app/page.tsx` (temporary), `scripts/sync-event-images.mjs`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: Tailwind tokens `bg-sfl-gold` / `text-sfl-black` / `text-sfl-gray` / `font-display` / `font-body`; fonts `oswald`, `inter` exported from `src/app/fonts.ts` (CSS vars `--font-oswald`, `--font-inter`); npm scripts `dev`, `build`, `start`, `lint`, `test`, `check`; sync script that copies `content/events/*/images/*` → `public/events/<slug>/`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "sfl-romania-web",
  "private": true,
  "engines": { "node": ">=20" },
  "scripts": {
    "predev": "node scripts/sync-event-images.mjs",
    "dev": "next dev",
    "prebuild": "node scripts/sync-event-images.mjs && vitest run --passWithNoTests",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest run --passWithNoTests",
    "check": "npm run lint && npm run test && npm run build"
  },
  "dependencies": {
    "gray-matter": "^4.0.3",
    "next": "^15.5.0",
    "next-intl": "^4.3.0",
    "next-mdx-remote": "^5.0.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "sharp": "^0.34.0",
    "yet-another-react-lightbox": "^3.21.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.2.0",
    "@tailwindcss/postcss": "^4.1.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.5.0",
    "tailwindcss": "^4.1.0",
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

Note: `vitest run --passWithNoTests` inside `prebuild` is deliberate — it makes every Vercel/Docker build run the full validation suite (translation parity, content schema), fulfilling the spec's "fails CI" requirement. `--passWithNoTests` keeps Task 1 (no tests yet) green.

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next.config.ts`, `postcss.config.mjs`, `.gitignore`**

`next.config.ts` (the next-intl plugin is added in Task 2, once `src/i18n/request.ts` exists — wiring it now would break this task's build):
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

`postcss.config.mjs`:
```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

`.gitignore`:
```
node_modules/
.next/
out/
public/events/
coverage/
*.tsbuildinfo
.env*
.vercel
.DS_Store
```

(`public/events/` is generated by the sync script — never commit it.)

- [ ] **Step 4: Write `eslint.config.mjs`** (the i18n enforcement lives here)

```js
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  { ignores: [".next/**", "node_modules/**", "public/**", "scripts/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/**/*.tsx"],
    rules: {
      "react/jsx-no-literals": [
        "error",
        { allowedStrings: ["RO", "EN", "•", "–", "|", "©"] }
      ]
    }
  }
];

export default config;
```

- [ ] **Step 5: Write `src/app/globals.css` and `src/app/fonts.ts`**

`src/app/globals.css`:
```css
@import "tailwindcss";

@theme {
  --color-sfl-gold: #ffc627;
  --color-sfl-black: #1a1a1a;
  --color-sfl-gray: #4b4b4b;
  --font-display: var(--font-oswald);
  --font-body: var(--font-inter);
}

body {
  @apply bg-white font-body text-sfl-black antialiased;
}
```

`src/app/fonts.ts`:
```ts
import { Inter, Oswald } from "next/font/google";

export const oswald = Oswald({
  subsets: ["latin", "latin-ext"],
  variable: "--font-oswald",
  weight: ["500", "600", "700"],
});

export const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});
```

- [ ] **Step 6: Write `scripts/sync-event-images.mjs`**

```js
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "content", "events");
const DEST = path.join(process.cwd(), "public", "events");

fs.rmSync(DEST, { recursive: true, force: true });
if (!fs.existsSync(SRC)) {
  console.log("sync-event-images: no content/events directory, nothing to do");
  process.exit(0);
}
let count = 0;
for (const dir of fs.readdirSync(SRC)) {
  if (dir.startsWith("_")) continue;
  const imgDir = path.join(SRC, dir, "images");
  if (!fs.existsSync(imgDir)) continue;
  fs.mkdirSync(path.join(DEST, dir), { recursive: true });
  for (const f of fs.readdirSync(imgDir)) {
    fs.copyFileSync(path.join(imgDir, f), path.join(DEST, dir, f));
    count++;
  }
}
console.log(`sync-event-images: copied ${count} images to public/events`);
```

- [ ] **Step 7: Write temporary root layout and page** (replaced in Task 2)

`src/app/layout.tsx`:
```tsx
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:
```tsx
export default function Placeholder() {
  return null;
}
```

- [ ] **Step 8: Install and verify**

Run: `npm install`
Then: `npm run lint` — Expected: no errors.
Then: `npm run build` — Expected: build succeeds (sync script logs "nothing to do", vitest passes with no tests).

If `npm install` hits a peer-dependency conflict on `next-mdx-remote` with React 19, retry that single package with `npm install next-mdx-remote@^5 --legacy-peer-deps` and note it in the commit message.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 app with Tailwind 4, fonts, lint i18n enforcement"
```

---

### Task 2: i18n foundation — routing, messages, layout, parity test

**Files:**
- Create: `messages/ro.json`, `messages/en.json`, `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/i18n/navigation.ts`, `src/middleware.ts`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx` (minimal, real version in Task 8), `vitest.config.ts`, `tests/messages.test.ts`
- Delete: `src/app/layout.tsx`, `src/app/page.tsx` (temporary files from Task 1)
- Modify: none

**Interfaces:**
- Consumes: `oswald`, `inter` from `@/app/fonts`; Tailwind tokens.
- Produces: `routing` (locales `["ro","en"]`, pathnames map — exact object below); `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname` from `@/i18n/navigation`; complete message catalogs (all namespaces for ALL later tasks: `nav`, `footer`, `home`, `events`, `eventDetail`, `about`, `getInvolved`, `notFound`, `tags`, `meta`); locale layout with `NextIntlClientProvider`.

- [ ] **Step 1: Write the failing test** — `vitest.config.ts` + `tests/messages.test.ts`

`vitest.config.ts`:
```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["tests/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
});
```

`tests/messages.test.ts`:
```ts
import { expect, it } from "vitest";
import ro from "../messages/ro.json";
import en from "../messages/en.json";

function keysOf(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === "object"
      ? keysOf(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`]
  );
}

it("ro.json and en.json have identical key sets", () => {
  expect(keysOf(ro).sort()).toEqual(keysOf(en).sort());
});

it("no message value is empty", () => {
  const check = (obj: Record<string, unknown>, path: string) => {
    for (const [k, v] of Object.entries(obj)) {
      if (v !== null && typeof v === "object") check(v as Record<string, unknown>, `${path}${k}.`);
      else expect(String(v).trim(), `${path}${k}`).not.toBe("");
    }
  };
  check(ro, "ro:");
  check(en, "en:");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/messages.test.ts`
Expected: FAIL — cannot resolve `../messages/ro.json` (files don't exist yet).

- [ ] **Step 3: Write `messages/ro.json`**

```json
{
  "nav": {
    "siteName": "Students for Liberty România",
    "home": "Acasă",
    "events": "Evenimente",
    "about": "Despre noi",
    "getInvolved": "Implică-te",
    "menu": "Meniu",
    "logoAlt": "Logo Students for Liberty România"
  },
  "footer": {
    "tagline": "Un viitor mai liber",
    "menuTitle": "Meniu",
    "followTitle": "Urmărește-ne",
    "contactTitle": "Contact",
    "globalLink": "Students For Liberty Global",
    "rights": "© {year} Students for Liberty România"
  },
  "home": {
    "heroTitle": "Students for Liberty România",
    "heroSubtitle": "Un viitor mai liber începe cu studenții de azi. Educăm și conectăm studenții care cred în libertate.",
    "heroCta": "Implică-te",
    "heroSecondaryCta": "Vezi evenimentele",
    "collageAlt": "Fotografii de la evenimentele Students for Liberty România",
    "nextEventLabel": "Următorul eveniment",
    "nextEventCta": "Detalii",
    "latestTitle": "Ultimele evenimente",
    "latestCta": "Toate evenimentele",
    "aboutTitle": "Cine suntem",
    "aboutText": "Suntem comunitatea din România a celei mai mari organizații studențești pro-libertate din lume. Organizăm conferințe, dezbateri și programe educaționale despre libertate, piețe libere și memoria comunismului.",
    "aboutCta": "Află mai multe",
    "joinTitle": "Alătură-te mișcării",
    "joinText": "Devino parte din comunitatea Students for Liberty România.",
    "joinCta": "Înscrie-te"
  },
  "events": {
    "title": "Evenimente",
    "intro": "Conferințe, dezbateri și programe educaționale organizate de Students for Liberty România.",
    "upcomingTab": "Viitoare",
    "pastTab": "Trecute",
    "allTags": "Toate",
    "emptyUpcoming": "Niciun eveniment programat momentan. Revino curând!",
    "emptyPast": "Niciun eveniment trecut.",
    "externalBadge": "Extern"
  },
  "eventDetail": {
    "date": "Data",
    "period": "Perioada",
    "location": "Locație",
    "speakers": "Speakeri",
    "moderators": "Moderatori",
    "partners": "Parteneri",
    "sponsors": "Sponsori",
    "gallery": "Galerie foto",
    "openImage": "Deschide imaginea",
    "backToEvents": "← Înapoi la evenimente"
  },
  "about": {
    "title": "Despre noi",
    "missionTitle": "Misiunea noastră",
    "missionText": "Students for Liberty România este comunitatea locală a Students For Liberty, cea mai mare organizație internațională de studenți dedicată libertății. Educăm, dezvoltăm și conectăm studenți din România și Republica Moldova care cred în libertate individuală, piețe libere și guvernare limitată.",
    "globalTitle": "Parte din Students For Liberty",
    "globalText": "Students For Liberty este o rețea globală prezentă în peste 100 de țări, care formează liderii libertății de mâine prin programe educaționale, conferințe și mentorat. SFL România aduce această misiune în universitățile din România și Republica Moldova.",
    "globalCta": "Vizitează studentsforliberty.org",
    "globalImageAlt": "Students For Liberty — comunitatea globală",
    "valuesTitle": "Valorile noastre",
    "value1Title": "Libertate individuală",
    "value1Text": "Fiecare om are dreptul să își trăiască viața așa cum alege, atâta timp cât respectă drepturile celorlalți.",
    "value2Title": "Piețe libere",
    "value2Text": "Schimbul voluntar și antreprenoriatul sunt motoarele prosperității.",
    "value3Title": "Memorie istorică",
    "value3Text": "Păstrăm vie memoria comunismului pentru ca generațiile de azi să înțeleagă prețul libertății.",
    "teamTitle": "Echipa noastră"
  },
  "getInvolved": {
    "title": "Implică-te",
    "intro": "Devino parte din comunitatea Students for Liberty România și construiește un viitor mai liber.",
    "benefitsTitle": "Ce primești ca membru",
    "benefit1Title": "Comunitate",
    "benefit1Text": "Studenți din toată România și Republica Moldova care împărtășesc pasiunea pentru libertate.",
    "benefit2Title": "Evenimente și programe",
    "benefit2Text": "Acces la conferințe, dezbateri, John Galt School, LibertyCon și burse internaționale.",
    "benefit3Title": "Dezvoltare personală",
    "benefit3Text": "Public speaking, organizare de evenimente, leadership și o rețea internațională.",
    "ctaTitle": "Gata să te alături?",
    "ctaButton": "Completează formularul de înscriere",
    "contactTitle": "Contactează-ne",
    "contactText": "Ai întrebări? Scrie-ne sau urmărește-ne pe rețelele sociale."
  },
  "notFound": {
    "title": "Pagina nu a fost găsită",
    "text": "Pagina pe care o cauți nu există sau a fost mutată.",
    "cta": "Înapoi acasă"
  },
  "tags": {
    "conference": "Conferință",
    "debate": "Dezbatere",
    "liberty-road-2026": "Liberty Road Romania 2026",
    "education-program": "Program educațional",
    "international": "Internațional"
  },
  "meta": {
    "defaultTitle": "Students for Liberty România — Un viitor mai liber",
    "defaultDescription": "Comunitatea din România a Students For Liberty: conferințe, dezbateri și programe educaționale despre libertate, piețe libere și memoria comunismului.",
    "events": {
      "title": "Evenimente",
      "description": "Evenimentele Students for Liberty România: conferințe, dezbateri și programe educaționale, viitoare și trecute."
    },
    "about": {
      "title": "Despre noi",
      "description": "Cine este Students for Liberty România: misiune, valori și echipă."
    },
    "getInvolved": {
      "title": "Implică-te",
      "description": "Alătură-te comunității Students for Liberty România."
    }
  }
}
```

- [ ] **Step 4: Write `messages/en.json`**

```json
{
  "nav": {
    "siteName": "Students for Liberty Romania",
    "home": "Home",
    "events": "Events",
    "about": "About us",
    "getInvolved": "Get involved",
    "menu": "Menu",
    "logoAlt": "Students for Liberty Romania logo"
  },
  "footer": {
    "tagline": "A freer future",
    "menuTitle": "Menu",
    "followTitle": "Follow us",
    "contactTitle": "Contact",
    "globalLink": "Students For Liberty Global",
    "rights": "© {year} Students for Liberty Romania"
  },
  "home": {
    "heroTitle": "Students for Liberty Romania",
    "heroSubtitle": "A freer future starts with today's students. We educate and connect students who believe in liberty.",
    "heroCta": "Get involved",
    "heroSecondaryCta": "See our events",
    "collageAlt": "Photos from Students for Liberty Romania events",
    "nextEventLabel": "Next event",
    "nextEventCta": "Details",
    "latestTitle": "Latest events",
    "latestCta": "All events",
    "aboutTitle": "Who we are",
    "aboutText": "We are the Romanian community of the world's largest pro-liberty student organization. We organize conferences, debates, and educational programs on liberty, free markets, and the memory of communism.",
    "aboutCta": "Learn more",
    "joinTitle": "Join the movement",
    "joinText": "Become part of the Students for Liberty Romania community.",
    "joinCta": "Sign up"
  },
  "events": {
    "title": "Events",
    "intro": "Conferences, debates, and educational programs organized by Students for Liberty Romania.",
    "upcomingTab": "Upcoming",
    "pastTab": "Past",
    "allTags": "All",
    "emptyUpcoming": "No events scheduled at the moment. Check back soon!",
    "emptyPast": "No past events.",
    "externalBadge": "External"
  },
  "eventDetail": {
    "date": "Date",
    "period": "Period",
    "location": "Location",
    "speakers": "Speakers",
    "moderators": "Moderators",
    "partners": "Partners",
    "sponsors": "Sponsors",
    "gallery": "Photo gallery",
    "openImage": "Open image",
    "backToEvents": "← Back to events"
  },
  "about": {
    "title": "About us",
    "missionTitle": "Our mission",
    "missionText": "Students for Liberty Romania is the local community of Students For Liberty, the largest international student organization dedicated to liberty. We educate, develop, and connect students from Romania and Moldova who believe in individual liberty, free markets, and limited government.",
    "globalTitle": "Part of Students For Liberty",
    "globalText": "Students For Liberty is a global network active in over 100 countries, training tomorrow's leaders of liberty through educational programs, conferences, and mentorship. SFL Romania brings this mission to universities across Romania and Moldova.",
    "globalCta": "Visit studentsforliberty.org",
    "globalImageAlt": "Students For Liberty — the global community",
    "valuesTitle": "Our values",
    "value1Title": "Individual liberty",
    "value1Text": "Every person has the right to live their life as they choose, as long as they respect the rights of others.",
    "value2Title": "Free markets",
    "value2Text": "Voluntary exchange and entrepreneurship are the engines of prosperity.",
    "value3Title": "Historical memory",
    "value3Text": "We keep the memory of communism alive so today's generations understand the price of freedom.",
    "teamTitle": "Our team"
  },
  "getInvolved": {
    "title": "Get involved",
    "intro": "Become part of the Students for Liberty Romania community and build a freer future.",
    "benefitsTitle": "What you get as a member",
    "benefit1Title": "Community",
    "benefit1Text": "Students from all over Romania and Moldova who share a passion for liberty.",
    "benefit2Title": "Events and programs",
    "benefit2Text": "Access to conferences, debates, John Galt School, LibertyCon, and international scholarships.",
    "benefit3Title": "Personal development",
    "benefit3Text": "Public speaking, event organizing, leadership, and an international network.",
    "ctaTitle": "Ready to join?",
    "ctaButton": "Fill in the signup form",
    "contactTitle": "Contact us",
    "contactText": "Questions? Write to us or follow us on social media."
  },
  "notFound": {
    "title": "Page not found",
    "text": "The page you are looking for does not exist or has been moved.",
    "cta": "Back home"
  },
  "tags": {
    "conference": "Conference",
    "debate": "Debate",
    "liberty-road-2026": "Liberty Road Romania 2026",
    "education-program": "Educational program",
    "international": "International"
  },
  "meta": {
    "defaultTitle": "Students for Liberty Romania — A freer future",
    "defaultDescription": "The Romanian community of Students For Liberty: conferences, debates, and educational programs on liberty, free markets, and the memory of communism.",
    "events": {
      "title": "Events",
      "description": "Students for Liberty Romania events: conferences, debates, and educational programs, upcoming and past."
    },
    "about": {
      "title": "About us",
      "description": "Who Students for Liberty Romania is: mission, values, and team."
    },
    "getInvolved": {
      "title": "Get involved",
      "description": "Join the Students for Liberty Romania community."
    }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/messages.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Write the i18n plumbing**

Replace `next.config.ts` with the next-intl-wrapped version (the request config it points to is created below):
```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
};

export default withNextIntl(nextConfig);
```

`src/i18n/routing.ts`:
```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ro", "en"],
  defaultLocale: "ro",
  localePrefix: "as-needed",
  pathnames: {
    "/": "/",
    "/evenimente": { ro: "/evenimente", en: "/events" },
    "/evenimente/[slug]": { ro: "/evenimente/[slug]", en: "/events/[slug]" },
    "/despre-noi": { ro: "/despre-noi", en: "/about" },
    "/implica-te": { ro: "/implica-te", en: "/get-involved" }
  }
});
```

`src/i18n/request.ts`:
```ts
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
```

`src/i18n/navigation.ts`:
```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

`src/middleware.ts`:
```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)"
};
```

- [ ] **Step 7: Replace root layout with locale layout**

Delete `src/app/layout.tsx` and `src/app/page.tsx`.

`src/app/[locale]/layout.tsx`:
```tsx
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { inter, oswald } from "@/app/fonts";
import { routing } from "@/i18n/routing";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { default: t("defaultTitle"), template: "%s | Students for Liberty România" },
    description: t("defaultDescription"),
    icons: { icon: "/images/sfl-romania-logo.png" },
    openGraph: { images: ["/images/sfl-flag.jpg"] }
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} className={`${oswald.variable} ${inter.variable}`}>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

(`metadataBase` is added in Task 5 when `@/site.config` exists. The title template is a config-level string, not JSX — the i18n lint rule does not apply to it, and the org name is identical in both languages except for the diacritic, which is part of the legal name.)

`src/app/[locale]/page.tsx` (minimal — real home page in Task 8):
```tsx
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  return (
    <main className="flex flex-1 items-center justify-center bg-sfl-gold px-4">
      <h1 className="text-center font-display text-5xl font-bold uppercase">
        {t("heroTitle")}
      </h1>
    </main>
  );
}
```

- [ ] **Step 8: Verify**

Run: `npm run test` — Expected: PASS.
Run: `npm run build` — Expected: succeeds; build output shows `/[locale]` prerendered for ro and en.
Run: `npm run dev`, open http://localhost:3000 → Romanian title on gold background; http://localhost:3000/en → English title. Stop dev server.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: i18n foundation with next-intl, full RO/EN message catalogs, parity test"
```

---

### Task 3: Event model, loader, and date formatting (TDD)

**Files:**
- Create: `src/lib/events.ts`, `src/lib/dates.ts`, `tests/events.test.ts`, `tests/dates.test.ts`, `tests/fixtures/valid/2099-01-test-event/{event.json,ro.mdx,en.mdx,images/photo.jpg}`, `tests/fixtures/invalid/bad-date/{event.json,ro.mdx,en.mdx,images/photo.jpg}`, `tests/fixtures/invalid/missing-en/{event.json,ro.mdx,images/photo.jpg}`, `tests/fixtures/invalid/bad-cover/{event.json,ro.mdx,en.mdx,images/photo.jpg}`, `content/events/_TEMPLATE/{event.json,ro.mdx,en.mdx,README.md,images/.gitkeep}`

**Interfaces:**
- Consumes: nothing from earlier tasks (pure lib).
- Produces (used by Tasks 4-10):
  - `type Locale = "ro" | "en"`, `const LOCALES: readonly ["ro", "en"]`
  - `type SflEvent = { slug: string; date: string; endDate?: string; city?: string; venue?: string; speakers: string[]; moderators: string[]; partners: string[]; sponsors: string[]; tags: string[]; cover: string; external: boolean; title: string; excerpt: string; body: string; images: string[]; coverUrl: string }`
  - `getAllEvents(locale: Locale, dir?: string): SflEvent[]`
  - `getEventBySlug(slug: string, locale: Locale, dir?: string): SflEvent`
  - `getAllSlugs(dir?: string): string[]`
  - `splitEvents(events: SflEvent[], now: Date): { upcoming: SflEvent[]; past: SflEvent[] }` — upcoming sorted soonest-first, past newest-first, boundary = end of `endDate ?? date` in Europe/Bucharest
  - `formatEventDate(locale: Locale, date: string, endDate?: string): string` from `@/lib/dates`

- [ ] **Step 1: Write the failing tests**

`tests/dates.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { formatEventDate } from "@/lib/dates";

describe("formatEventDate", () => {
  it("formats a single date in Romanian", () => {
    expect(formatEventDate("ro", "2025-12-13")).toBe("13 decembrie 2025");
  });

  it("formats a single date in English", () => {
    expect(formatEventDate("en", "2025-12-13")).toBe("December 13, 2025");
  });

  it("formats a range within the same month", () => {
    const s = formatEventDate("ro", "2026-04-24", "2026-04-26");
    expect(s).toContain("24");
    expect(s).toContain("26");
    expect(s).toContain("aprilie 2026");
  });

  it("formats a range across months", () => {
    const s = formatEventDate("en", "2026-02-01", "2026-05-31");
    expect(s).toContain("February");
    expect(s).toContain("May");
    expect(s).toContain("2026");
  });
});
```

`tests/events.test.ts`:
```ts
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getAllEvents,
  getAllSlugs,
  loadEvent,
  splitEvents,
  todayInBucharest,
  type SflEvent
} from "@/lib/events";

const VALID = path.join(import.meta.dirname, "fixtures", "valid");
const INVALID = path.join(import.meta.dirname, "fixtures", "invalid");

function makeEvent(overrides: Partial<SflEvent>): SflEvent {
  return {
    slug: "e",
    date: "2026-01-01",
    speakers: [],
    moderators: [],
    partners: [],
    sponsors: [],
    tags: [],
    cover: "c.jpg",
    external: false,
    title: "T",
    excerpt: "X",
    body: "",
    images: [],
    coverUrl: "",
    ...overrides
  };
}

describe("loader", () => {
  it("loads a valid event in both locales", () => {
    const ro = loadEvent("2099-01-test-event", "ro", VALID);
    expect(ro.title).toBe("Eveniment de test");
    expect(ro.city).toBe("București");
    expect(ro.images).toEqual(["/events/2099-01-test-event/photo.jpg"]);
    expect(ro.coverUrl).toBe("/events/2099-01-test-event/photo.jpg");
    const en = loadEvent("2099-01-test-event", "en", VALID);
    expect(en.title).toBe("Test event");
    expect(en.city).toBe("Bucharest");
  });

  it("getAllSlugs skips _ folders and sorts", () => {
    expect(getAllSlugs(VALID)).toEqual(["2099-01-test-event"]);
  });

  it("getAllEvents loads everything", () => {
    expect(getAllEvents("ro", VALID)).toHaveLength(1);
  });

  it("rejects a malformed date, naming file and field", () => {
    expect(() => loadEvent("bad-date", "ro", INVALID)).toThrow(/bad-date\/event\.json: date/);
  });

  it("rejects a missing locale file", () => {
    expect(() => loadEvent("missing-en", "en", INVALID)).toThrow(/missing-en: missing en\.mdx/);
  });

  it("rejects a cover that is not in images/", () => {
    expect(() => loadEvent("bad-cover", "ro", INVALID)).toThrow(/bad-cover\/event\.json: cover/);
  });
});

describe("splitEvents", () => {
  const noon = new Date("2026-07-30T12:00:00Z");

  it("an event today is upcoming; yesterday is past", () => {
    const today = makeEvent({ slug: "today", date: "2026-07-30" });
    const yesterday = makeEvent({ slug: "yesterday", date: "2026-07-29" });
    const { upcoming, past } = splitEvents([today, yesterday], noon);
    expect(upcoming.map((e) => e.slug)).toEqual(["today"]);
    expect(past.map((e) => e.slug)).toEqual(["yesterday"]);
  });

  it("a running multi-day event (endDate in future) is upcoming", () => {
    const running = makeEvent({ slug: "run", date: "2026-07-01", endDate: "2026-08-01" });
    expect(splitEvents([running], noon).upcoming).toHaveLength(1);
  });

  it("upcoming is soonest-first, past is newest-first", () => {
    const a = makeEvent({ slug: "a", date: "2026-08-01" });
    const b = makeEvent({ slug: "b", date: "2026-09-01" });
    const c = makeEvent({ slug: "c", date: "2026-01-01" });
    const d = makeEvent({ slug: "d", date: "2026-02-01" });
    const { upcoming, past } = splitEvents([b, a, c, d], noon);
    expect(upcoming.map((e) => e.slug)).toEqual(["a", "b"]);
    expect(past.map((e) => e.slug)).toEqual(["d", "c"]);
  });

  it("uses Bucharest local date, not UTC", () => {
    // 21:30 UTC on Jul 30 is 00:30 on Jul 31 in Bucharest (UTC+3 in summer)
    expect(todayInBucharest(new Date("2026-07-30T21:30:00Z"))).toBe("2026-07-31");
  });
});
```

- [ ] **Step 2: Write the fixtures**

`tests/fixtures/valid/2099-01-test-event/event.json`:
```json
{
  "slug": "2099-01-test-event",
  "date": "2099-01-15",
  "city": { "ro": "București", "en": "Bucharest" },
  "venue": { "ro": "Sala de test", "en": "Test hall" },
  "speakers": ["Test Speaker"],
  "tags": ["conference"],
  "cover": "photo.jpg"
}
```

`tests/fixtures/valid/2099-01-test-event/ro.mdx`:
```mdx
---
title: Eveniment de test
excerpt: Un eveniment folosit doar în teste.
---

Corpul evenimentului de test.
```

`tests/fixtures/valid/2099-01-test-event/en.mdx`:
```mdx
---
title: Test event
excerpt: An event used only in tests.
---

The body of the test event.
```

`tests/fixtures/valid/2099-01-test-event/images/photo.jpg` — write a file containing the single word `placeholder` (the loader only lists filenames; it never decodes images).

`tests/fixtures/invalid/bad-date/event.json` (plus copies of the valid `ro.mdx`, `en.mdx`, `images/photo.jpg`):
```json
{
  "slug": "bad-date",
  "date": "13-12-2025",
  "cover": "photo.jpg"
}
```

`tests/fixtures/invalid/missing-en/event.json` (plus `ro.mdx` and `images/photo.jpg`, **no** `en.mdx`):
```json
{
  "slug": "missing-en",
  "date": "2025-12-13",
  "cover": "photo.jpg"
}
```

`tests/fixtures/invalid/bad-cover/event.json` (plus `ro.mdx`, `en.mdx`, `images/photo.jpg`):
```json
{
  "slug": "bad-cover",
  "date": "2025-12-13",
  "cover": "does-not-exist.jpg"
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/events.test.ts tests/dates.test.ts`
Expected: FAIL — `@/lib/events` and `@/lib/dates` don't exist.

- [ ] **Step 4: Implement `src/lib/dates.ts`**

```ts
import type { Locale } from "./events";

const INTL_LOCALE: Record<Locale, string> = { ro: "ro-RO", en: "en-US" };

const OPTS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC"
};

/** Formats "2025-12-13" as "13 decembrie 2025" (ro) / "December 13, 2025" (en).
 *  With endDate, formats a range like "24–26 aprilie 2026". */
export function formatEventDate(locale: Locale, date: string, endDate?: string): string {
  const fmt = new Intl.DateTimeFormat(INTL_LOCALE[locale], OPTS);
  const start = new Date(`${date}T00:00:00Z`);
  if (!endDate || endDate === date) return fmt.format(start);
  return fmt.formatRange(start, new Date(`${endDate}T00:00:00Z`));
}
```

- [ ] **Step 5: Implement `src/lib/events.ts`**

```ts
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const LOCALES = ["ro", "en"] as const;
export type Locale = (typeof LOCALES)[number];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const DEFAULT_DIR = path.join(process.cwd(), "content", "events");

const localizedString = z.object({
  ro: z.string().min(1),
  en: z.string().min(1)
});

export const eventMetaSchema = z.object({
  slug: z.string().min(1),
  date: z.string().regex(ISO_DATE, "must be YYYY-MM-DD"),
  endDate: z.string().regex(ISO_DATE, "must be YYYY-MM-DD").optional(),
  city: localizedString.optional(),
  venue: localizedString.optional(),
  speakers: z.array(z.string().min(1)).default([]),
  moderators: z.array(z.string().min(1)).default([]),
  partners: z.array(z.string().min(1)).default([]),
  sponsors: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1)).default([]),
  cover: z.string().min(1),
  external: z.boolean().default(false)
});

const frontmatterSchema = z.object({
  title: z.string().min(1),
  excerpt: z.string().min(1)
});

export type SflEvent = {
  slug: string;
  date: string;
  endDate?: string;
  city?: string;
  venue?: string;
  speakers: string[];
  moderators: string[];
  partners: string[];
  sponsors: string[];
  tags: string[];
  cover: string;
  external: boolean;
  title: string;
  excerpt: string;
  body: string;
  images: string[];
  coverUrl: string;
};

function fail(context: string, error: z.ZodError): never {
  const issue = error.issues[0];
  throw new Error(`${context}: ${issue.path.join(".")} ${issue.message}`);
}

export function getEventFolders(dir = DEFAULT_DIR): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name)
    .sort();
}

export function loadEvent(folder: string, locale: Locale, dir = DEFAULT_DIR): SflEvent {
  const eventDir = path.join(dir, folder);

  const metaPath = path.join(eventDir, "event.json");
  if (!fs.existsSync(metaPath)) throw new Error(`${folder}: missing event.json`);
  const parsed = eventMetaSchema.safeParse(JSON.parse(fs.readFileSync(metaPath, "utf8")));
  if (!parsed.success) fail(`${folder}/event.json`, parsed.error);
  const meta = parsed.data;
  if (meta.slug !== folder) {
    throw new Error(`${folder}/event.json: slug "${meta.slug}" must match the folder name`);
  }
  if (meta.endDate && meta.endDate < meta.date) {
    throw new Error(`${folder}/event.json: endDate is before date`);
  }

  const mdxPath = path.join(eventDir, `${locale}.mdx`);
  if (!fs.existsSync(mdxPath)) throw new Error(`${folder}: missing ${locale}.mdx`);
  const { data, content } = matter(fs.readFileSync(mdxPath, "utf8"));
  const fm = frontmatterSchema.safeParse(data);
  if (!fm.success) fail(`${folder}/${locale}.mdx`, fm.error);

  const imagesDir = path.join(eventDir, "images");
  const files = fs.existsSync(imagesDir)
    ? fs.readdirSync(imagesDir).filter((f) => IMAGE_EXT.test(f)).sort()
    : [];
  if (files.length === 0) throw new Error(`${folder}: images/ has no images`);
  if (!files.includes(meta.cover)) {
    throw new Error(`${folder}/event.json: cover "${meta.cover}" not found in images/`);
  }

  return {
    slug: meta.slug,
    date: meta.date,
    endDate: meta.endDate,
    city: meta.city?.[locale],
    venue: meta.venue?.[locale],
    speakers: meta.speakers,
    moderators: meta.moderators,
    partners: meta.partners,
    sponsors: meta.sponsors,
    tags: meta.tags,
    cover: meta.cover,
    external: meta.external,
    title: fm.data.title,
    excerpt: fm.data.excerpt,
    body: content.trim(),
    images: files.map((f) => `/events/${folder}/${f}`),
    coverUrl: `/events/${folder}/${meta.cover}`
  };
}

export function getAllEvents(locale: Locale, dir = DEFAULT_DIR): SflEvent[] {
  return getEventFolders(dir).map((folder) => loadEvent(folder, locale, dir));
}

export function getEventBySlug(slug: string, locale: Locale, dir = DEFAULT_DIR): SflEvent {
  return loadEvent(slug, locale, dir);
}

export function getAllSlugs(dir = DEFAULT_DIR): string[] {
  return getEventFolders(dir);
}

/** Returns YYYY-MM-DD for `now` in Europe/Bucharest (sv-SE formats as ISO). */
export function todayInBucharest(now: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

export function splitEvents(
  events: SflEvent[],
  now: Date
): { upcoming: SflEvent[]; past: SflEvent[] } {
  const today = todayInBucharest(now);
  const lastDay = (e: SflEvent) => e.endDate ?? e.date;
  return {
    upcoming: events
      .filter((e) => lastDay(e) >= today)
      .sort((a, b) => a.date.localeCompare(b.date)),
    past: events
      .filter((e) => lastDay(e) < today)
      .sort((a, b) => b.date.localeCompare(a.date))
  };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/events.test.ts tests/dates.test.ts`
Expected: PASS (all tests).

- [ ] **Step 7: Create the `_TEMPLATE` folder**

`content/events/_TEMPLATE/event.json`:
```json
{
  "slug": "YYYY-MM-numele-evenimentului",
  "date": "YYYY-MM-DD",
  "city": { "ro": "Oraș", "en": "City" },
  "venue": { "ro": "Locul desfășurării", "en": "Venue name" },
  "speakers": ["Nume Speaker"],
  "moderators": [],
  "partners": [],
  "sponsors": [],
  "tags": ["conference"],
  "cover": "cover.jpg",
  "external": false
}
```

`content/events/_TEMPLATE/ro.mdx`:
```mdx
---
title: Titlul evenimentului
excerpt: Un rezumat de 1-2 propoziții afișat pe cardul evenimentului.
---

Descrierea completă a evenimentului, în română. Paragrafele sunt separate prin linii goale.
```

`content/events/_TEMPLATE/en.mdx`:
```mdx
---
title: Event title
excerpt: A 1-2 sentence summary shown on the event card.
---

The full event description, in English. Paragraphs are separated by blank lines.
```

`content/events/_TEMPLATE/README.md`:
```markdown
# Cum adaugi un eveniment / How to add an event

1. Copiază folderul `_TEMPLATE` și redenumește-l `YYYY-MM-numele-evenimentului`
   (ex. `2026-10-conferinta-toamna`). / Copy `_TEMPLATE`, rename it `YYYY-MM-event-name`.
2. În `event.json`: `slug` TREBUIE să fie identic cu numele folderului; `date` în format
   `YYYY-MM-DD` (+ `endDate` pentru evenimente de mai multe zile); `tags` folosește chei
   definite în `messages/*.json` sub `tags`; `cover` este numele unei imagini din `images/`.
   / In `event.json`: `slug` MUST equal the folder name; `date` is `YYYY-MM-DD`
   (+ `endDate` for multi-day events); `tags` uses keys defined under `tags` in
   `messages/*.json`; `cover` is a filename from `images/`.
3. Completează `ro.mdx` ȘI `en.mdx` (ambele obligatorii). / Fill in BOTH `ro.mdx` and `en.mdx`.
4. Pune fotografiile în `images/` (jpg/png/webp). / Put the photos in `images/`.
5. Șterge acest README din copia ta, apoi commit + push. Vercel publică automat.
   / Delete this README from your copy, then commit + push. Vercel deploys automatically.

Evenimentele cu data în viitor apar la „Viitoare" și trec singure la „Trecute" după ce
data trece. / Events with a future date appear under "Upcoming" and move to "Past"
automatically once the date passes.
```

`content/events/_TEMPLATE/images/.gitkeep` — empty file.

- [ ] **Step 8: Full verification**

Run: `npm run test` — Expected: all tests pass (messages + events + dates).
Run: `npm run lint` — Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: event content model, loader with zod validation, upcoming/past split, date formatting"
```

---

### Task 4: Migrate real event content

**Files:**
- Create: 9 event folders under `content/events/` (full contents below), `public/images/sfl-flag.jpg`, `public/images/sfl-romania-logo.png`, `tests/content.test.ts`
- Move: existing raw folders + docx → `content/source/`

**Interfaces:**
- Consumes: `getAllEvents`, `getAllSlugs`, `LOCALES` from `@/lib/events` (Task 3); `tags` namespace in messages (Task 2).
- Produces: the 9 real events every page renders; brand images used by layout/Navbar/Footer.

**Content note:** All RO/EN body text below is taken verbatim from `SFL_Romania_Descrieri_Evenimente.docx` (light grammar fix in the JGS English text). The docx contains one inconsistency: RO says "NICOM", EN says "NICON" for the Portugal scholarship event — this plan uses **NICON** in both languages; flag it to the user at final review.

- [ ] **Step 1: Move raw material to `content/source/` and extract brand assets** (Bash tool; run from repo root)

```bash
mkdir -p content/source public/images
mv "content/eveniment decembrie" "content/eveniment muzeul ororilor com" \
   "content/JGS" "content/LRR Chisinau" "content/LRR Iasi" "content/LRR Bucuresti" \
   "content/LRR Cluj" "content/Constanta" "content/Liberty Con" \
   "content/SFL_Romania_Descrieri_Evenimente.docx" content/source/
mv content/SFL-Flag.jpg content/source/
mv content/*nscrieri*.png content/source/sfl-romania-logo.png
cp content/source/SFL-Flag.jpg public/images/sfl-flag.jpg
cp content/source/sfl-romania-logo.png public/images/sfl-romania-logo.png
```

(The `*nscrieri*` glob avoids diacritic-encoding issues with the original filename "Înscrieri în SFL Liberty (1).png".)

- [ ] **Step 2: Create the 9 event folders and copy photos** (Bash tool)

```bash
cd content/events
for s in 2025-12-revolutia-cauze-si-eveniment-istoric \
         2026-02-john-galt-school \
         2026-03-comunismul-rememorat-studentilor \
         2026-04-libertycon-madrid \
         2026-04-lrr-bucuresti \
         2026-05-lrr-cluj-napoca \
         2026-05-lrr-iasi \
         2026-05-lrr-chisinau \
         2026-07-securitatea-marii-negre-constanta; do
  mkdir -p "$s/images"
done
cd ../..
cp "content/source/eveniment decembrie/IMG_1445.JPG" content/events/2025-12-revolutia-cauze-si-eveniment-istoric/images/
cp content/source/JGS/*.JPG content/events/2026-02-john-galt-school/images/
cp "content/source/eveniment muzeul ororilor com/IMG_2705.jpg" \
   "content/source/eveniment muzeul ororilor com/f3e9dad3-774a-4fc7-bd24-03fb0ce44057.JPG" \
   content/events/2026-03-comunismul-rememorat-studentilor/images/
cp "content/source/Liberty Con"/*.JPG content/events/2026-04-libertycon-madrid/images/
cp "content/source/LRR Bucuresti"/*.JPG content/events/2026-04-lrr-bucuresti/images/
cp "content/source/LRR Cluj"/*.JPG content/events/2026-05-lrr-cluj-napoca/images/
cp "content/source/LRR Iasi"/*.JPG content/events/2026-05-lrr-iasi/images/
cp "content/source/LRR Chisinau"/*.JPEG content/events/2026-05-lrr-chisinau/images/
cp content/source/Constanta/*.JPG content/events/2026-07-securitatea-marii-negre-constanta/images/
```

- [ ] **Step 3: Write the 9 × 3 content files** (Write tool; exact contents follow)

**`content/events/2025-12-revolutia-cauze-si-eveniment-istoric/event.json`:**
```json
{
  "slug": "2025-12-revolutia-cauze-si-eveniment-istoric",
  "date": "2025-12-13",
  "city": { "ro": "București", "en": "Bucharest" },
  "venue": { "ro": "Universitatea Româno-Americană", "en": "Romanian-American University" },
  "speakers": ["Andrei Ursu", "Bogdan Glăvan", "Alexandru Groza"],
  "partners": ["Liga Pașopt"],
  "tags": ["conference"],
  "cover": "IMG_1445.JPG"
}
```

**`.../ro.mdx`:**
```mdx
---
title: "Revoluția: Cauze și Eveniment Istoric"
excerpt: "Primul eveniment SFL România: o conferință despre căderea regimului comunist, alături de Andrei Ursu, Bogdan Glăvan și Alexandru Groza."
---

Primul eveniment organizat de Students For Liberty România, realizat împreună cu Liga Pașopt. Conferința a analizat contextul economic și social care a dus la prăbușirea regimului comunist, cu accent pe austeritate, revoltele muncitorești și momentele decisive din decembrie '89.

Bogdan Glăvan a vorbit despre incapacitatea sistemului comunist de a ieși dintr-o stagnare economică continuă. Alexandru Groza a discutat despre nostalgie și efectul educației din acea perioadă asupra României de azi. Andrei Ursu a prezentat, într-o expunere de două ore, căderea regimului în mod cronologic.
```

**`.../en.mdx`:**
```mdx
---
title: "The Revolution: Causes and Historical Event"
excerpt: "SFL Romania's first event: a conference on the fall of the communist regime, with Andrei Ursu, Bogdan Glăvan, and Alexandru Groza."
---

The first event organized by Students For Liberty Romania, held together with Liga Pașopt. The conference examined the economic and social context that led to the collapse of the communist regime, focusing on austerity, workers' unrest, and the decisive moments of December 1989.

Bogdan Glăvan addressed the communist system's inability to escape continuous economic stagnation. Alexandru Groza discussed nostalgia and how education from that era still shapes Romania today. Andrei Ursu delivered a two hour chronological account of the regime's fall.
```

**`content/events/2026-02-john-galt-school/event.json`:**
```json
{
  "slug": "2026-02-john-galt-school",
  "date": "2026-02-01",
  "endDate": "2026-05-31",
  "speakers": [
    "Anano Khorbaladze",
    "Bogdan Glăvan",
    "Radu Uszkai",
    "Stephen Hicks",
    "Rob Tracinski",
    "Robert Ciobanu",
    "Andrei-Răzvan Crăciun",
    "Constantin-Emanuel Zota"
  ],
  "tags": ["education-program"],
  "cover": "IMG_3251.JPG"
}
```

**`.../ro.mdx`:**
```mdx
---
title: "John Galt School Romania"
excerpt: "Programul educațional SFL România dedicat Objectivismului, eticii capitaliste și libertății de exprimare — opt lecturi, februarie–mai 2026."
---

John Galt School Romania este programul educațional al SFL România dedicat filosofiei Objectivismului, eticii capitaliste și libertății de exprimare. Pe parcursul a opt lecturi, participanții au explorat introducerea în Objectivism, piețele libere, libertatea de exprimare, metafizica objectivistă, etica objectivistă și semnificația morală a capitalismului, încheind cu un club de carte pe romanul Anthem și o sesiune de dezbatere.

Programul a inclus teme săptămânale, rapoarte și postări pe social media pentru participanți, iar cei mai buni patru studenți au primit o bursă la NICON, Portugalia, în septembrie 2026.
```

**`.../en.mdx`:**
```mdx
---
title: "John Galt School Romania"
excerpt: "SFL Romania's educational program on Objectivism, capitalist ethics, and free speech — eight lectures, February–May 2026."
---

John Galt School Romania is SFL Romania's educational program dedicated to Objectivist philosophy, capitalist ethics, and free speech. Across eight lectures, participants explored an introduction to Objectivism, free markets, free speech, Objectivist metaphysics, Objectivist ethics, and the moral meaning of capitalism, closing with an Anthem book club and a debate session.

The program included weekly assignments, reports, and social media posts for participants, with the top four students receiving a scholarship to NICON, Portugal, in September 2026.
```

**`content/events/2026-03-comunismul-rememorat-studentilor/event.json`:**
```json
{
  "slug": "2026-03-comunismul-rememorat-studentilor",
  "date": "2026-03-28",
  "city": { "ro": "București", "en": "Bucharest" },
  "venue": { "ro": "Galeria Posibilă, Strada Popa Petre 21", "en": "Galeria Posibilă, 21 Popa Petre Street" },
  "speakers": ["Mariana Beșciu", "Ghenadie Popescu"],
  "moderators": ["Irina Hasnaș-Hubbard"],
  "tags": ["conference"],
  "cover": "IMG_2705.jpg"
}
```

**`.../ro.mdx`:**
```mdx
---
title: "Comunismul Rememorat Studenților"
excerpt: "Mărturia directă a Marianei Beșciu, fost deținut politic, într-un dialog despre memorie și viața sub comunism."
---

Un eveniment dedicat memoriei, dialogului și înțelegerii trecutului recent. Publicul a putut asculta mărturia directă a Marianei Beșciu, fost deținut politic, într-o discuție moderată de Irina Hasnaș-Hubbard. Evenimentul a inclus și animațiile lui Ghenadie Popescu despre deportările din Basarabia.

S-a discutat despre deportări, viața sub regimul comunist și provocările conservării memoriei colective prin muzee. Istoria nu se citește doar în manuale, ci se simte prin mărturii, iar libertatea de azi se sprijină pe sacrificii pe care nu ni le putem permite să le uităm.
```

**`.../en.mdx`:**
```mdx
---
title: "Communism, Remembered for Students"
excerpt: "The direct testimony of former political prisoner Mariana Beșciu, in a dialogue about memory and life under communism."
---

An event dedicated to memory, dialogue, and understanding the recent past. Attendees heard the direct testimony of Mariana Beșciu, a former political prisoner, in a discussion moderated by Irina Hasnaș-Hubbard. The event also featured Ghenadie Popescu's animations on the deportations from Bessarabia.

Topics included deportations, life under the communist regime, and the challenges of preserving collective memory through museums. History is not only read in textbooks, it is felt through testimony, and today's freedom rests on sacrifices we cannot afford to forget.
```

**`content/events/2026-04-libertycon-madrid/event.json`:**
```json
{
  "slug": "2026-04-libertycon-madrid",
  "date": "2026-04-24",
  "endDate": "2026-04-26",
  "city": { "ro": "Madrid, Spania", "en": "Madrid, Spain" },
  "partners": ["Students For Liberty (Global)"],
  "tags": ["international"],
  "cover": "IMG_3388.JPG",
  "external": true
}
```

**`.../ro.mdx`:**
```mdx
---
title: "LibertyCon Madrid 2026"
excerpt: "Delegația SFL România la una dintre cele mai mari conferințe libertariene din lume, la Madrid."
---

În aprilie, delegația SFL România a participat la LibertyCon 2026, una dintre cele mai mari conferințe libertariene din lume. Evenimentul a reunit organizații precum Atlas Network, Ayn Rand Institute, Human Rights Foundation, Mercatus Center și Atlas Society International, alături de mii de studenți și tineri profesioniști din întreaga lume.

Participarea la LibertyCon a venit imediat înainte de lansarea turneului Liberty Road Romania 2026.
```

**`.../en.mdx`:**
```mdx
---
title: "LibertyCon Madrid 2026"
excerpt: "The SFL Romania delegation at one of the world's largest libertarian conferences, in Madrid."
---

In April, the SFL Romania delegation attended LibertyCon 2026, one of the largest libertarian gatherings in the world. The event brought together organizations such as Atlas Network, Ayn Rand Institute, Human Rights Foundation, Mercatus Center, and Atlas Society International, alongside thousands of students and young professionals from around the world.

Attendance at LibertyCon came right before the launch of the Liberty Road Romania 2026 tour.
```

**`content/events/2026-04-lrr-bucuresti/event.json`:**
```json
{
  "slug": "2026-04-lrr-bucuresti",
  "date": "2026-04-29",
  "city": { "ro": "București", "en": "Bucharest" },
  "venue": { "ro": "Universitatea Româno-Americană, Sala 017", "en": "Romanian-American University, Room 017" },
  "speakers": ["Fengsuo Zhou", "Octavian Țîcu", "Robert Ciobanu"],
  "moderators": ["Matei Dragoș-Cristian"],
  "partners": ["Muzeul Ororilor Comunismului din România"],
  "tags": ["liberty-road-2026", "conference"],
  "cover": "IMG_3622.JPG"
}
```

**`.../ro.mdx`:**
```mdx
---
title: "Liberty Road București — Moștenirea Anului 1989"
excerpt: "Fengsuo Zhou, supraviețuitor Tiananmen, la București: legătura dintre Piața Universității și Piața Tiananmen."
---

În 1989, un student chinez a înfruntat un tanc. 37 de ani mai târziu, Fengsuo Zhou a venit la București să povestească de ce a meritat. „Moștenirea Anului 1989" a explorat legătura dintre Piața Universității și Piața Tiananmen, moștenirea mișcărilor pentru libertate, independența Republicii Moldova și rolul societății civile, precum și lecțiile trecutului pentru generațiile de astăzi.

Evenimentul a fost organizat de Students For Liberty România, cu sprijinul Muzeului Ororilor Comunismului din România. Prima oprire a turneului Liberty Road Romania 2026: patru orașe, patru conversații despre libertate.
```

**`.../en.mdx`:**
```mdx
---
title: "Liberty Road Bucharest — The Legacy of 1989"
excerpt: "Tiananmen survivor Fengsuo Zhou in Bucharest: the link between University Square and Tiananmen Square."
---

In 1989, a Chinese student stood in front of a tank. Thirty seven years later, Fengsuo Zhou came to Bucharest to explain why it mattered. "The Legacy of 1989" explored the connection between University Square and Tiananmen Square, the legacy of freedom movements, Moldova's independence and the role of civil society, and the lessons of the past for today's generations.

The event was organized by Students For Liberty Romania with the support of the Museum of Communist Horrors of Romania. The first stop of the Liberty Road Romania 2026 tour: four cities, four conversations about freedom.
```

**`content/events/2026-05-lrr-cluj-napoca/event.json`:**
```json
{
  "slug": "2026-05-lrr-cluj-napoca",
  "date": "2026-05-05",
  "city": { "ro": "Cluj-Napoca", "en": "Cluj-Napoca" },
  "venue": { "ro": "Turnul Croitorilor, Strada Baba Novac 35", "en": "The Tailors' Tower, 35 Baba Novac Street" },
  "speakers": ["Radu Nechita", "Adrian Dohotaru"],
  "moderators": ["Alexia Rus"],
  "tags": ["liberty-road-2026", "debate"],
  "cover": "IMG_3880.JPG"
}
```

**`.../ro.mdx`:**
```mdx
---
title: "Liberty Road Cluj-Napoca — Intervenționism vs. Piața Liberă"
excerpt: "Duel de idei: Radu Nechita vs. Adrian Dohotaru despre piața liberă și intervenționism, la Turnul Croitorilor."
---

Un duel de idei între două viziuni economice: Radu Nechita a susținut cazul piaței libere cu precizia cuiva care a studiat decenii întregi ce funcționează și de ce, iar Adrian Dohotaru a apărat poziția intervenționistă cu convingere și onestitate intelectuală. Evenimentul a inclus și o sesiune de open mic pentru public.

Alexia Rus a menținut energia discuției de la început până la final. Cluj-Napoca a arătat că o dezbatere reală poate schimba minți, nu doar confirma ce cred deja oamenii.
```

**`.../en.mdx`:**
```mdx
---
title: "Liberty Road Cluj-Napoca — Interventionism vs. the Free Market"
excerpt: "A clash of ideas: Radu Nechita vs. Adrian Dohotaru on free markets and interventionism, at the Tailors' Tower."
---

A real clash of ideas between two economic visions: Radu Nechita made the case for free markets with the precision of someone who has spent decades studying what actually works and why, while Adrian Dohotaru defended the interventionist position with genuine conviction and intellectual honesty. The event also featured an open mic session for the audience.

Alexia Rus kept the energy going from start to finish. Cluj-Napoca showed that a real debate can change minds, not just confirm what people already believe.
```

**`content/events/2026-05-lrr-iasi/event.json`:**
```json
{
  "slug": "2026-05-lrr-iasi",
  "date": "2026-05-14",
  "city": { "ro": "Iași", "en": "Iași" },
  "venue": { "ro": "Universitatea Alexandru Ioan Cuza", "en": "Alexandru Ioan Cuza University" },
  "speakers": ["Jan Mošovský", "Erekle Gozalishvili", "Cristian Păun"],
  "tags": ["liberty-road-2026", "conference"],
  "cover": "IMG_4242.JPG"
}
```

**`.../ro.mdx`:**
```mdx
---
title: "Liberty Road Iași — Free Market Road Show"
excerpt: "Free Market Road Show la Iași: idei și consecințele lor, cu Jan Mošovský, Erekle Gozalishvili și Cristian Păun."
---

Piața liberă nu are nevoie de apărare, are nevoie de o scenă. Free Market Road Show a adus la Iași o discuție despre idei și consecințele lor, alături de Jan Mošovský, Erekle Gozalishvili și Cristian Păun, la Universitatea Alexandru Ioan Cuza.
```

**`.../en.mdx`:**
```mdx
---
title: "Liberty Road Iași — Free Market Road Show"
excerpt: "The Free Market Road Show in Iași: ideas and their consequences, with Jan Mošovský, Erekle Gozalishvili, and Cristian Păun."
---

The free market doesn't need a defense, it needs a stage. The Free Market Road Show brought a conversation about ideas and their consequences to Iași, featuring Jan Mošovský, Erekle Gozalishvili, and Cristian Păun at Alexandru Ioan Cuza University.
```

**`content/events/2026-05-lrr-chisinau/event.json`:**
```json
{
  "slug": "2026-05-lrr-chisinau",
  "date": "2026-05-16",
  "city": { "ro": "Chișinău", "en": "Chișinău" },
  "venue": { "ro": "Universitatea de Stat din Moldova, Aula Regina Maria", "en": "Moldova State University, Regina Maria Hall" },
  "speakers": ["Erekle Gozalishvili", "Jan Mošovský", "Scott Schneider", "Martin Pánek"],
  "partners": ["Tinerii Diplomați din Republica Moldova", "ELSA Moldova", "MSE", "Consiliul Studenților Economiști"],
  "sponsors": ["Eco Wine of Moldova"],
  "tags": ["liberty-road-2026", "conference"],
  "cover": "DJI_20260516144106_0049_D.JPEG"
}
```

**`.../ro.mdx`:**
```mdx
---
title: "Liberty Road Chișinău — Prosperitate, Securitate și Europa"
excerpt: "Ultima oprire a turneului: prosperitate, securitate și viitorul european al regiunii, la Chișinău."
---

Ultima oprire a turneului Liberty Road Romania 2026 a adus la Chișinău o discuție despre prosperitate, securitate și viitorul european al regiunii, teme esențiale pentru o țară aflată pe drumul spre UE și confruntată cu presiuni reale de securitate.

Evenimentul a fost organizat de Students for Liberty România alături de Tinerii Diplomați din Republica Moldova, ELSA Moldova, MSE și Consiliul Studenților Economiști, cu sprijinul Eco Wine of Moldova.
```

**`.../en.mdx`:**
```mdx
---
title: "Liberty Road Chișinău — Prosperity, Security, and Europe"
excerpt: "The tour's final stop: prosperity, security, and the region's European future, in Chișinău."
---

The final stop of the Liberty Road Romania 2026 tour brought a conversation about prosperity, security, and Europe's future to Chișinău, essential topics for a country navigating its path toward the EU while facing real security pressures.

The event was organized by Students for Liberty Romania together with the Young Diplomats of Moldova, ELSA Moldova, MSE, and the Council of Economics Students, with support from Eco Wine of Moldova.
```

**`content/events/2026-07-securitatea-marii-negre-constanta/event.json`:**
```json
{
  "slug": "2026-07-securitatea-marii-negre-constanta",
  "date": "2026-07-08",
  "city": { "ro": "Constanța", "en": "Constanța" },
  "venue": { "ro": "Zbor Hub Constanța", "en": "Zbor Hub Constanța" },
  "speakers": ["Dr. Marius Cojocaru"],
  "partners": ["Zbor Hub Constanța", "Facultatea de Istorie și Științe Politice, Universitatea „Ovidius" din Constanța"],
  "tags": ["conference"],
  "cover": "IMG_6146.JPG"
}
```

**`.../ro.mdx`:**
```mdx
---
title: "Securitatea Mării Negre"
excerpt: "Rolul NATO și al SUA în securitatea Mării Negre, cu Dr. Marius Cojocaru, la Zbor Hub Constanța."
---

Rolul SUA și NATO în securitatea regională nu mai este un subiect abstract, e vecinătatea noastră. Alături de Dr. Marius Cojocaru, discuția a abordat rolul NATO și al SUA în regiune, dronele navale, atacurile asupra infrastructurii civile și un adevăr simplu: libertatea nu supraviețuiește fără securitate.

Evenimentul a fost organizat de Students for Liberty România în colaborare cu Zbor Hub Constanța și Facultatea de Istorie și Științe Politice a Universității „Ovidius" din Constanța.
```

**`.../en.mdx`:**
```mdx
---
title: "Black Sea Security"
excerpt: "NATO's and the US's role in Black Sea security, with Dr. Marius Cojocaru, at Zbor Hub Constanța."
---

The role of the US and NATO in regional security is no longer an abstract topic, it is our neighborhood. Alongside Dr. Marius Cojocaru, the discussion covered NATO and US involvement in the region, naval drones, attacks on civilian infrastructure, and a simple truth: freedom does not survive without security.

The event was organized by Students for Liberty Romania in collaboration with Zbor Hub Constanța and the Faculty of History and Political Sciences at "Ovidius" University of Constanța.
```

- [ ] **Step 4: Write the failing content test** — `tests/content.test.ts`

```ts
import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import ro from "../messages/ro.json";
import { getAllEvents, getAllSlugs, LOCALES } from "@/lib/events";

describe("real content", () => {
  it("has the 9 launch events", () => {
    expect(getAllSlugs()).toHaveLength(9);
  });

  it("every event loads in every locale (schema + both mdx files)", () => {
    for (const locale of LOCALES) {
      const events = getAllEvents(locale);
      expect(events).toHaveLength(9);
      for (const e of events) {
        expect(e.title.length).toBeGreaterThan(0);
        expect(e.excerpt.length).toBeGreaterThan(0);
        expect(e.body.length).toBeGreaterThan(0);
        expect(e.images.length).toBeGreaterThan(0);
      }
    }
  });

  it("every event tag has a translation in both locales", () => {
    const roTags = ro.tags as Record<string, string>;
    const enTags = en.tags as Record<string, string>;
    for (const e of getAllEvents("ro")) {
      for (const tag of e.tags) {
        expect(roTags[tag], `ro tag ${tag}`).toBeTruthy();
        expect(enTags[tag], `en tag ${tag}`).toBeTruthy();
      }
    }
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `npm run test`
Expected: PASS. If a content file has a typo, the loader's error names the exact file and field — fix and re-run.

- [ ] **Step 6: Verify image sync**

Run: `node scripts/sync-event-images.mjs`
Expected: "copied 16 images to public/events" (1+2+2+2+2+1+2+1+3 = 16).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: migrate all 9 launch events (RO/EN) and brand assets from source material"
```

---

### Task 5: Site shell — config, Navbar, LocaleSwitcher, Footer

**Files:**
- Create: `src/site.config.ts`, `src/components/Navbar.tsx`, `src/components/LocaleSwitcher.tsx`, `src/components/Footer.tsx`
- Modify: `src/app/[locale]/layout.tsx` (add metadataBase, Navbar, Footer)

**Interfaces:**
- Consumes: `Link`/`usePathname` from `@/i18n/navigation`; `nav`/`footer` message namespaces; brand images from Task 4.
- Produces: `siteConfig` (`{ name: string; url: string; contactEmail: string; signupFormUrl: string; social: readonly { name: string; url: string }[] }`); `<Navbar />` and `<Footer />` rendered on every page via the layout.

- [ ] **Step 1: Write `src/site.config.ts`**

```ts
export const siteConfig = {
  name: "Students for Liberty România",
  // TODO(SFL): set the real production domain before launch
  url: "https://sfl-romania.vercel.app",
  // TODO(SFL): completați emailul de contact / set the contact email (empty = hidden)
  contactEmail: "",
  // TODO(SFL): înlocuiți cu formularul vostru de înscriere / replace with your signup form URL
  signupFormUrl: "https://studentsforliberty.org/",
  // TODO(SFL): add your real profiles; entries with an empty url are hidden
  social: [
    { name: "Instagram", url: "" },
    { name: "Facebook", url: "" },
    { name: "TikTok", url: "" },
    { name: "LinkedIn", url: "" }
  ]
} as const;
```

- [ ] **Step 2: Write `src/components/LocaleSwitcher.tsx`**

```tsx
"use client";

import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABELS: Record<string, string> = { ro: "RO", en: "EN" };

export default function LocaleSwitcher() {
  const pathname = usePathname();
  const params = useParams();
  const locale = useLocale();

  return (
    <div className="flex items-center gap-1 font-display text-sm font-bold">
      {routing.locales.map((l) => (
        <Link
          key={l}
          // @ts-expect-error -- pathname+params are valid for the current route (next-intl docs pattern)
          href={{ pathname, params }}
          locale={l}
          className={
            l === locale
              ? "bg-sfl-gold px-2 py-1 text-sfl-black"
              : "px-2 py-1 text-white hover:text-sfl-gold"
          }
        >
          {LABELS[l]}
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/Navbar.tsx`**

```tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import LocaleSwitcher from "./LocaleSwitcher";

const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/evenimente", key: "events" },
  { href: "/despre-noi", key: "about" },
  { href: "/implica-te", key: "getInvolved" }
] as const;

export default function Navbar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const linkClass = (href: string) =>
    `font-display text-sm font-bold uppercase tracking-wide transition-colors ${
      pathname === href ? "text-sfl-gold" : "text-white hover:text-sfl-gold"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-sfl-black">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-3" onClick={() => setOpen(false)}>
          <Image
            src="/images/sfl-romania-logo.png"
            alt={t("logoAlt")}
            width={44}
            height={44}
            priority
          />
          <span className="font-display text-lg font-bold uppercase tracking-wider text-white">
            {t("siteName")}
          </span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link key={item.key} href={item.href} className={linkClass(item.href)}>
              {t(item.key)}
            </Link>
          ))}
          <LocaleSwitcher />
        </div>

        <button
          type="button"
          aria-label={t("menu")}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex flex-col gap-1.5 p-2 md:hidden"
        >
          <span className="h-0.5 w-6 bg-sfl-gold" />
          <span className="h-0.5 w-6 bg-sfl-gold" />
          <span className="h-0.5 w-6 bg-sfl-gold" />
        </button>
      </nav>

      {open && (
        <div className="flex flex-col gap-4 border-t border-sfl-gray px-4 py-4 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={linkClass(item.href)}
              onClick={() => setOpen(false)}
            >
              {t(item.key)}
            </Link>
          ))}
          <LocaleSwitcher />
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 4: Write `src/components/Footer.tsx`**

```tsx
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/site.config";

const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/evenimente", key: "events" },
  { href: "/despre-noi", key: "about" },
  { href: "/implica-te", key: "getInvolved" }
] as const;

export default async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const social = siteConfig.social.filter((s) => s.url !== "");

  return (
    <footer className="bg-sfl-black text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-3">
        <div className="flex flex-col items-start gap-3">
          <Image src="/images/sfl-romania-logo.png" alt={tNav("logoAlt")} width={56} height={56} />
          <p className="font-display text-xl font-bold uppercase text-sfl-gold">{t("tagline")}</p>
        </div>

        <div>
          <h2 className="mb-3 font-display font-bold uppercase text-sfl-gold">{t("menuTitle")}</h2>
          <ul className="space-y-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="hover:text-sfl-gold">
                  {tNav(item.key)}
                </Link>
              </li>
            ))}
            <li>
              <a
                href="https://studentsforliberty.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-sfl-gold"
              >
                {t("globalLink")}
              </a>
            </li>
          </ul>
        </div>

        <div>
          {social.length > 0 && (
            <>
              <h2 className="mb-3 font-display font-bold uppercase text-sfl-gold">
                {t("followTitle")}
              </h2>
              <ul className="mb-6 space-y-2">
                {social.map((s) => (
                  <li key={s.name}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-sfl-gold">
                      {s.name}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
          {siteConfig.contactEmail !== "" && (
            <>
              <h2 className="mb-3 font-display font-bold uppercase text-sfl-gold">
                {t("contactTitle")}
              </h2>
              <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-sfl-gold">
                {siteConfig.contactEmail}
              </a>
            </>
          )}
        </div>
      </div>
      <div className="border-t border-sfl-gray/40 py-4 text-center text-sm text-white/70">
        {t("rights", { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
```

- [ ] **Step 5: Wire into the layout**

In `src/app/[locale]/layout.tsx`:
- Add imports: `import Navbar from "@/components/Navbar"; import Footer from "@/components/Footer"; import { siteConfig } from "@/site.config";`
- In `generateMetadata`, add `metadataBase: new URL(siteConfig.url),` as the first property of the returned object.
- Change the body to:

```tsx
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider>
          <Navbar />
          {children}
          <Footer />
        </NextIntlClientProvider>
      </body>
```

- [ ] **Step 6: Verify**

Run: `npm run lint` — Expected: clean (all strings via `t()`, allowed exceptions only).
Run: `npm run build` — Expected: success.
Run: `npm run dev` — check: navbar + footer on `/` and `/en`; locale switcher flips language and stays on the same page; mobile menu opens below 768px viewport width. Stop dev server.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: site shell with navbar, locale switcher, footer, and site config"
```

---

### Task 6: Events listing page

**Files:**
- Create: `src/components/EventCard.tsx`, `src/components/EventsExplorer.tsx`, `src/lib/cards.ts`, `src/lib/seo.ts`, `src/app/[locale]/evenimente/page.tsx`

**Interfaces:**
- Consumes: `getAllEvents`, `splitEvents`, `SflEvent`, `Locale` (Task 3); `formatEventDate` (Task 3); `tags`/`events` messages (Task 2); `getPathname` (Task 2); `siteConfig` (Task 5).
- Produces:
  - `type EventTag = { key: string; label: string }` and `type EventCardData = { slug: string; title: string; excerpt: string; dateLabel: string; city?: string; coverUrl: string; tags: EventTag[]; external: boolean }` exported from `@/components/EventCard`
  - `toCardData(e: SflEvent, locale: Locale, tagLabel: (key: string) => string): EventCardData` from `@/lib/cards`
  - `alternatesFor(href)` from `@/lib/seo` — used by Tasks 7-9 for hreflang metadata

- [ ] **Step 1: Write `src/lib/seo.ts`**

```ts
import { getPathname } from "@/i18n/navigation";
import { siteConfig } from "@/site.config";

type Href = Parameters<typeof getPathname>[0]["href"];

/** hreflang alternates for a route in both locales; x-default points to Romanian. */
export function alternatesFor(href: Href) {
  const ro = getPathname({ locale: "ro", href });
  const en = getPathname({ locale: "en", href });
  return {
    languages: {
      ro: `${siteConfig.url}${ro}`,
      en: `${siteConfig.url}${en}`,
      "x-default": `${siteConfig.url}${ro}`
    }
  };
}
```

- [ ] **Step 2: Write `src/components/EventCard.tsx`**

```tsx
"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export type EventTag = { key: string; label: string };

export type EventCardData = {
  slug: string;
  title: string;
  excerpt: string;
  dateLabel: string;
  city?: string;
  coverUrl: string;
  tags: EventTag[];
  external: boolean;
};

export default function EventCard({ event }: { event: EventCardData }) {
  const t = useTranslations("events");

  return (
    <article className="group h-full overflow-hidden border-2 border-sfl-black bg-white transition-shadow hover:shadow-[6px_6px_0_0_var(--color-sfl-gold)]">
      <Link
        href={{ pathname: "/evenimente/[slug]", params: { slug: event.slug } }}
        className="flex h-full flex-col"
      >
        <div className="relative aspect-[16/9]">
          <Image
            src={event.coverUrl}
            alt={event.title}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover"
          />
          <span className="absolute left-0 top-0 bg-sfl-gold px-3 py-1 font-display text-sm font-bold uppercase text-sfl-black">
            {event.dateLabel}
          </span>
          {event.external && (
            <span className="absolute right-0 top-0 bg-sfl-black px-3 py-1 text-xs font-bold uppercase text-sfl-gold">
              {t("externalBadge")}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4">
          {event.city && (
            <p className="text-xs font-semibold uppercase tracking-wide text-sfl-gray">
              {event.city}
            </p>
          )}
          <h3 className="mt-1 font-display text-xl font-bold uppercase leading-tight">
            {event.title}
          </h3>
          <p className="mt-2 flex-1 text-sm text-sfl-gray">{event.excerpt}</p>
          {event.tags.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {event.tags.map((tag) => (
                <li
                  key={tag.key}
                  className="border border-sfl-black px-2 py-0.5 text-xs font-semibold uppercase"
                >
                  {tag.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Link>
    </article>
  );
}
```

- [ ] **Step 3: Write `src/lib/cards.ts`**

```ts
import type { EventCardData } from "@/components/EventCard";
import { formatEventDate } from "./dates";
import type { Locale, SflEvent } from "./events";

export function toCardData(
  e: SflEvent,
  locale: Locale,
  tagLabel: (key: string) => string
): EventCardData {
  return {
    slug: e.slug,
    title: e.title,
    excerpt: e.excerpt,
    dateLabel: formatEventDate(locale, e.date, e.endDate),
    city: e.city,
    coverUrl: e.coverUrl,
    tags: e.tags.map((key) => ({ key, label: tagLabel(key) })),
    external: e.external
  };
}
```

- [ ] **Step 4: Write `src/components/EventsExplorer.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import EventCard, { type EventCardData } from "./EventCard";

type Tab = "upcoming" | "past";

export default function EventsExplorer({
  upcoming,
  past
}: {
  upcoming: EventCardData[];
  past: EventCardData[];
}) {
  const t = useTranslations("events");
  const [tab, setTab] = useState<Tab>(upcoming.length > 0 ? "upcoming" : "past");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const events = tab === "upcoming" ? upcoming : past;

  const tags = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of events) for (const tag of e.tags) map.set(tag.key, tag.label);
    return [...map.entries()].map(([key, label]) => ({ key, label }));
  }, [events]);

  const visible = activeTag
    ? events.filter((e) => e.tags.some((tag) => tag.key === activeTag))
    : events;

  const selectTab = (next: Tab) => {
    setTab(next);
    setActiveTag(null);
  };

  const tabClass = (active: boolean) =>
    `px-6 py-2 font-display font-bold uppercase transition-colors ${
      active ? "bg-sfl-black text-sfl-gold" : "bg-white text-sfl-black hover:bg-sfl-gold"
    }`;

  const chipClass = (active: boolean) =>
    `border border-sfl-black px-3 py-1 text-xs font-semibold uppercase transition-colors ${
      active ? "bg-sfl-black text-sfl-gold" : "bg-white hover:bg-sfl-gold"
    }`;

  return (
    <div>
      <div role="tablist" className="inline-flex border-2 border-sfl-black">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "upcoming"}
          onClick={() => selectTab("upcoming")}
          className={tabClass(tab === "upcoming")}
        >
          {t("upcomingTab")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "past"}
          onClick={() => selectTab("past")}
          className={tabClass(tab === "past")}
        >
          {t("pastTab")}
        </button>
      </div>

      {tags.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setActiveTag(null)} className={chipClass(activeTag === null)}>
            {t("allTags")}
          </button>
          {tags.map((tag) => (
            <button
              key={tag.key}
              type="button"
              onClick={() => setActiveTag(tag.key)}
              className={chipClass(activeTag === tag.key)}
            >
              {tag.label}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="mt-10 text-lg text-sfl-gray">
          {tab === "upcoming" ? t("emptyUpcoming") : t("emptyPast")}
        </p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((e) => (
            <EventCard key={e.slug} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Write `src/app/[locale]/evenimente/page.tsx`**

```tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import EventsExplorer from "@/components/EventsExplorer";
import { toCardData } from "@/lib/cards";
import { getAllEvents, splitEvents, type Locale, type SflEvent } from "@/lib/events";
import { alternatesFor } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("events.title"),
    description: t("events.description"),
    alternates: alternatesFor("/evenimente")
  };
}

export default async function EventsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("events");
  const tTags = await getTranslations("tags");

  const { upcoming, past } = splitEvents(getAllEvents(locale as Locale), new Date());
  const map = (list: SflEvent[]) =>
    list.map((e) => toCardData(e, locale as Locale, (key) => tTags(key)));

  return (
    <main className="flex-1">
      <section className="bg-sfl-black py-14 text-center">
        <h1 className="font-display text-5xl font-bold uppercase text-sfl-gold">{t("title")}</h1>
        <p className="mx-auto mt-4 max-w-2xl px-4 text-white/90">{t("intro")}</p>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-10">
        <EventsExplorer upcoming={map(upcoming)} past={map(past)} />
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Verify**

Run: `npm run lint && npm run test` — Expected: clean/PASS.
Run: `npm run build` — Expected: success; `/evenimente` and `/en/events` in output.
Run: `npm run dev` — check `/evenimente`: "Trecute" tab active by default (all 9 events are past), 9 cards newest-first (Constanța first), tag chips filter (clicking "Liberty Road Romania 2026" leaves 4), `/en/events` shows English. Stop dev server.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: blog-style events listing with upcoming/past tabs and tag filter"
```

---

### Task 7: Event detail page with gallery

**Files:**
- Create: `src/app/[locale]/evenimente/[slug]/page.tsx`, `src/components/EventInfo.tsx`, `src/components/Gallery.tsx`

**Interfaces:**
- Consumes: `getEventBySlug`, `getAllSlugs`, `SflEvent`, `Locale`, `formatEventDate`, `alternatesFor`, `eventDetail` messages.
- Produces: statically generated detail pages for every locale × slug; `<Gallery images={string[]} title={string} />`; `<EventInfo event={SflEvent} locale={Locale} />`.

- [ ] **Step 1: Write `src/components/EventInfo.tsx`** (server component)

```tsx
import { getTranslations } from "next-intl/server";
import { formatEventDate } from "@/lib/dates";
import type { Locale, SflEvent } from "@/lib/events";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
      <dt className="w-32 shrink-0 font-display text-sm font-bold uppercase text-sfl-gray">
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

export default async function EventInfo({ event, locale }: { event: SflEvent; locale: Locale }) {
  const t = await getTranslations("eventDetail");
  const location = [event.venue, event.city].filter(Boolean).join(", ");

  return (
    <dl className="space-y-3 border-2 border-sfl-black bg-sfl-gold/10 p-6">
      <Row
        label={event.endDate ? t("period") : t("date")}
        value={formatEventDate(locale, event.date, event.endDate)}
      />
      {location !== "" && <Row label={t("location")} value={location} />}
      {event.speakers.length > 0 && <Row label={t("speakers")} value={event.speakers.join(", ")} />}
      {event.moderators.length > 0 && (
        <Row label={t("moderators")} value={event.moderators.join(", ")} />
      )}
      {event.partners.length > 0 && <Row label={t("partners")} value={event.partners.join(", ")} />}
      {event.sponsors.length > 0 && <Row label={t("sponsors")} value={event.sponsors.join(", ")} />}
    </dl>
  );
}
```

- [ ] **Step 2: Write `src/components/Gallery.tsx`**

```tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

export default function Gallery({ images, title }: { images: string[]; title: string }) {
  const t = useTranslations("eventDetail");
  const [index, setIndex] = useState(-1);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            aria-label={t("openImage")}
            onClick={() => setIndex(i)}
            className="relative aspect-[4/3] overflow-hidden border-2 border-sfl-black"
          >
            <Image
              src={src}
              alt={`${title} ${i + 1}`}
              fill
              sizes="(min-width: 768px) 33vw, 50vw"
              className="object-cover transition-transform hover:scale-105"
            />
          </button>
        ))}
      </div>
      <Lightbox
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        slides={images.map((src) => ({ src }))}
      />
    </div>
  );
}
```

- [ ] **Step 3: Write `src/app/[locale]/evenimente/[slug]/page.tsx`**

```tsx
import Image from "next/image";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getTranslations, setRequestLocale } from "next-intl/server";
import EventInfo from "@/components/EventInfo";
import Gallery from "@/components/Gallery";
import { Link } from "@/i18n/navigation";
import { getAllSlugs, getEventBySlug, type Locale } from "@/lib/events";
import { alternatesFor } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const event = getEventBySlug(slug, locale as Locale);
  return {
    title: event.title,
    description: event.excerpt,
    alternates: alternatesFor({ pathname: "/evenimente/[slug]", params: { slug } }),
    openGraph: { images: [event.coverUrl] }
  };
}

export default async function EventPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("eventDetail");
  const event = getEventBySlug(slug, locale as Locale);

  return (
    <main className="flex-1">
      <div className="relative aspect-[21/9] max-h-[420px] w-full overflow-hidden">
        <Image
          src={event.coverUrl}
          alt={event.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sfl-black/80 to-transparent" />
        <h1 className="absolute bottom-6 left-1/2 w-full max-w-4xl -translate-x-1/2 px-4 font-display text-3xl font-bold uppercase text-white md:text-5xl">
          {event.title}
        </h1>
      </div>

      <article className="mx-auto max-w-4xl px-4 py-10">
        <Link
          href="/evenimente"
          className="font-display text-sm font-bold uppercase text-sfl-gray hover:text-sfl-black"
        >
          {t("backToEvents")}
        </Link>

        <div className="mt-6">
          <EventInfo event={event} locale={locale as Locale} />
        </div>

        <div className="mt-8 text-lg leading-relaxed [&_p]:mb-5">
          <MDXRemote source={event.body} />
        </div>

        <h2 className="mb-4 mt-12 font-display text-2xl font-bold uppercase">{t("gallery")}</h2>
        <Gallery images={event.images} title={event.title} />
      </article>
    </main>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npm run lint && npm run test` — Expected: clean/PASS.
Run: `npm run build` — Expected: success; 18 detail pages (9 slugs × 2 locales) prerendered.
Run: `npm run dev` — check `/evenimente/2026-04-lrr-bucuresti`: hero image + title, info box shows date/location/speakers/moderators/partners, body paragraphs, gallery opens lightbox with prev/next. Check `/en/events/2026-04-lrr-bucuresti` shows English. Switch locale via navbar on the detail page — must stay on the same event. Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: event detail pages with info box, MDX body, and photo gallery lightbox"
```

---

### Task 8: Home page

**Files:**
- Modify: `src/app/[locale]/page.tsx` (replace the Task 2 placeholder entirely)

**Interfaces:**
- Consumes: everything above — `splitEvents`, `toCardData`, `EventCard`, `formatEventDate`, `alternatesFor`, `home` messages, `Link`.
- Produces: the finished landing page.

- [ ] **Step 1: Replace `src/app/[locale]/page.tsx`**

```tsx
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import EventCard from "@/components/EventCard";
import { Link } from "@/i18n/navigation";
import { toCardData } from "@/lib/cards";
import { formatEventDate } from "@/lib/dates";
import { getAllEvents, splitEvents, type Locale } from "@/lib/events";
import { alternatesFor } from "@/lib/seo";

export const revalidate = 3600;

const COLLAGE = [
  "/events/2026-04-lrr-bucuresti/IMG_3622.JPG",
  "/events/2026-05-lrr-chisinau/DJI_20260516144106_0049_D.JPEG",
  "/events/2026-07-securitatea-marii-negre-constanta/IMG_6146.JPG",
  "/events/2026-05-lrr-cluj-napoca/IMG_3880.JPG"
] as const;

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    description: t("defaultDescription"),
    alternates: alternatesFor("/")
  };
}

export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tTags = await getTranslations("tags");

  const { upcoming, past } = splitEvents(getAllEvents(locale as Locale), new Date());
  const nextEvent = upcoming[0];
  const latest = past.slice(0, 3).map((e) => toCardData(e, locale as Locale, (k) => tTags(k)));

  return (
    <main className="flex-1">
      <section className="bg-sfl-gold">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <h1 className="font-display text-4xl font-bold uppercase leading-tight md:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 max-w-md text-lg">{t("heroSubtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/implica-te"
                className="bg-sfl-black px-6 py-3 font-display font-bold uppercase text-sfl-gold transition-colors hover:bg-sfl-gray"
              >
                {t("heroCta")}
              </Link>
              <Link
                href="/evenimente"
                className="border-2 border-sfl-black px-6 py-3 font-display font-bold uppercase transition-colors hover:bg-sfl-black hover:text-sfl-gold"
              >
                {t("heroSecondaryCta")}
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {COLLAGE.map((src, i) => (
              <div key={src} className="relative aspect-square overflow-hidden border-2 border-sfl-black">
                <Image
                  src={src}
                  alt={`${t("collageAlt")} ${i + 1}`}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover"
                  priority={i < 2}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {nextEvent && (
        <section className="bg-sfl-black py-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4">
            <div>
              <p className="font-display text-sm font-bold uppercase text-sfl-gold">
                {t("nextEventLabel")}
              </p>
              <p className="font-display text-2xl font-bold uppercase text-white">
                {nextEvent.title}
                <span className="text-sfl-gold"> • </span>
                <span className="text-white/80">
                  {formatEventDate(locale as Locale, nextEvent.date, nextEvent.endDate)}
                </span>
              </p>
            </div>
            <Link
              href={{ pathname: "/evenimente/[slug]", params: { slug: nextEvent.slug } }}
              className="bg-sfl-gold px-6 py-3 font-display font-bold uppercase text-sfl-black hover:bg-white"
            >
              {t("nextEventCta")}
            </Link>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-display text-3xl font-bold uppercase">{t("latestTitle")}</h2>
          <Link
            href="/evenimente"
            className="font-display text-sm font-bold uppercase text-sfl-gray hover:text-sfl-black"
          >
            {t("latestCta")}
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((e) => (
            <EventCard key={e.slug} event={e} />
          ))}
        </div>
      </section>

      <section className="bg-sfl-black py-14">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold uppercase text-sfl-gold">
            {t("aboutTitle")}
          </h2>
          <p className="mt-4 text-lg text-white/90">{t("aboutText")}</p>
          <Link
            href="/despre-noi"
            className="mt-6 inline-block border-2 border-sfl-gold px-6 py-3 font-display font-bold uppercase text-sfl-gold transition-colors hover:bg-sfl-gold hover:text-sfl-black"
          >
            {t("aboutCta")}
          </Link>
        </div>
      </section>

      <section className="bg-sfl-gold py-14">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold uppercase">{t("joinTitle")}</h2>
          <p className="mt-3 text-lg">{t("joinText")}</p>
          <Link
            href="/implica-te"
            className="mt-6 inline-block bg-sfl-black px-8 py-3 font-display font-bold uppercase text-sfl-gold hover:bg-sfl-gray"
          >
            {t("joinCta")}
          </Link>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run test && npm run build` — Expected: all green.
Run: `npm run dev` — check `/`: gold hero with photo collage, no "next event" banner (all events past — correct), 3 latest event cards (Constanța, Chișinău, Iași), dark about strip, gold join strip; `/en` fully English. Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: home page with hero collage, next-event banner, latest events, CTAs"
```

---

### Task 9: About & Get involved pages (+ team data, TDD)

**Files:**
- Create: `src/lib/team.ts`, `content/team.json`, `tests/team.test.ts`, `src/app/[locale]/despre-noi/page.tsx`, `src/app/[locale]/implica-te/page.tsx`, optionally `public/images/global/sfl-global.jpg`

**Interfaces:**
- Consumes: `about`/`getInvolved` messages, `siteConfig`, `alternatesFor`.
- Produces: `getTeam(locale: "ro" | "en", file?: string): { name: string; role: string; photo?: string }[]` from `@/lib/team`; both pages.

- [ ] **Step 1: Write the failing test** — `tests/team.test.ts`

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getTeam } from "@/lib/team";

const tmpFiles: string[] = [];

function writeTemp(content: string): string {
  const file = path.join(os.tmpdir(), `team-${tmpFiles.length}-${process.pid}.json`);
  fs.writeFileSync(file, content);
  tmpFiles.push(file);
  return file;
}

afterEach(() => {
  for (const f of tmpFiles.splice(0)) fs.rmSync(f, { force: true });
});

describe("getTeam", () => {
  it("returns [] for an empty file", () => {
    expect(getTeam("ro", writeTemp("[]"))).toEqual([]);
  });

  it("resolves localized roles", () => {
    const file = writeTemp(
      JSON.stringify([{ name: "Ana Pop", role: { ro: "Președinte", en: "President" } }])
    );
    expect(getTeam("ro", file)).toEqual([{ name: "Ana Pop", role: "Președinte", photo: undefined }]);
    expect(getTeam("en", file)[0].role).toBe("President");
  });

  it("rejects entries missing a localized role", () => {
    const file = writeTemp(JSON.stringify([{ name: "Ana Pop", role: { ro: "Președinte" } }]));
    expect(() => getTeam("ro", file)).toThrow(/team\.json/);
  });

  it("reads the real content/team.json without throwing", () => {
    expect(() => getTeam("ro")).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/team.test.ts`
Expected: FAIL — `@/lib/team` does not exist.

- [ ] **Step 3: Implement `src/lib/team.ts` and `content/team.json`**

`src/lib/team.ts`:
```ts
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const DEFAULT_FILE = path.join(process.cwd(), "content", "team.json");

const teamSchema = z.array(
  z.object({
    name: z.string().min(1),
    role: z.object({ ro: z.string().min(1), en: z.string().min(1) }),
    photo: z.string().optional()
  })
);

export type TeamMember = { name: string; role: string; photo?: string };

export function getTeam(locale: "ro" | "en", file = DEFAULT_FILE): TeamMember[] {
  const parsed = teamSchema.safeParse(JSON.parse(fs.readFileSync(file, "utf8")));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`team.json: ${issue.path.join(".")} ${issue.message}`);
  }
  return parsed.data.map((m) => ({ name: m.name, role: m.role[locale], photo: m.photo }));
}
```

`content/team.json`:
```json
[]
```

(Team members are added later by the SFL team — format documented in the README, Task 11. The About page hides the team section while this is empty.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/team.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Try to fetch one SFL Global image** (spec: "some images taken from studentsforliberty.org")

```bash
mkdir -p public/images/global
curl -sL https://studentsforliberty.org/ -o /tmp/sfl-home.html && \
  grep -oE 'https://[^"]+\.(webp|jpe?g|png)' /tmp/sfl-home.html | sort -u | head -20
```

Pick a hero/collage-style image URL from the output (prefer one whose filename suggests students/community, e.g. the `SFL-Hero-Collage` asset) and download it:

```bash
curl -sL -o public/images/global/sfl-global.jpg "<CHOSEN_URL>"
```

Verify the file is a real image (`file public/images/global/sfl-global.jpg` or open it). **If the download fails or returns HTML** (CDN blocking), skip it: use `/images/sfl-flag.jpg` as the About-page global image instead, and note this in the commit message. The page code below reads the path from a constant — set `GLOBAL_IMAGE` accordingly.

- [ ] **Step 6: Write `src/app/[locale]/despre-noi/page.tsx`**

```tsx
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getTeam } from "@/lib/team";
import { alternatesFor } from "@/lib/seo";

// Set to "/images/global/sfl-global.jpg" if Step 5 succeeded, otherwise "/images/sfl-flag.jpg"
const GLOBAL_IMAGE = "/images/global/sfl-global.jpg";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("about.title"),
    description: t("about.description"),
    alternates: alternatesFor("/despre-noi")
  };
}

export default async function AboutPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const team = getTeam(locale as "ro" | "en");

  const values = [
    { title: t("value1Title"), text: t("value1Text") },
    { title: t("value2Title"), text: t("value2Text") },
    { title: t("value3Title"), text: t("value3Text") }
  ];

  return (
    <main className="flex-1">
      <section className="bg-sfl-black py-14 text-center">
        <h1 className="font-display text-5xl font-bold uppercase text-sfl-gold">{t("title")}</h1>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14">
        <h2 className="font-display text-3xl font-bold uppercase">{t("missionTitle")}</h2>
        <p className="mt-4 text-lg leading-relaxed">{t("missionText")}</p>
      </section>

      <section className="bg-sfl-black">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold uppercase text-sfl-gold">
              {t("globalTitle")}
            </h2>
            <p className="mt-4 text-lg text-white/90">{t("globalText")}</p>
            <a
              href="https://studentsforliberty.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-block bg-sfl-gold px-6 py-3 font-display font-bold uppercase text-sfl-black hover:bg-white"
            >
              {t("globalCta")}
            </a>
          </div>
          <div className="relative aspect-[3/2] overflow-hidden border-2 border-sfl-gold">
            <Image
              src={GLOBAL_IMAGE}
              alt={t("globalImageAlt")}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center font-display text-3xl font-bold uppercase">{t("valuesTitle")}</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {values.map((v) => (
            <div key={v.title} className="border-2 border-sfl-black bg-sfl-gold p-6">
              <h3 className="font-display text-xl font-bold uppercase">{v.title}</h3>
              <p className="mt-2">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {team.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-14">
          <h2 className="text-center font-display text-3xl font-bold uppercase">{t("teamTitle")}</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {team.map((m) => (
              <div key={m.name} className="border-2 border-sfl-black p-4 text-center">
                {m.photo && (
                  <div className="relative mx-auto mb-3 aspect-square w-32 overflow-hidden rounded-full">
                    <Image src={m.photo} alt={m.name} fill sizes="128px" className="object-cover" />
                  </div>
                )}
                <p className="font-display text-lg font-bold uppercase">{m.name}</p>
                <p className="text-sm text-sfl-gray">{m.role}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 7: Write `src/app/[locale]/implica-te/page.tsx`**

```tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { alternatesFor } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("getInvolved.title"),
    description: t("getInvolved.description"),
    alternates: alternatesFor("/implica-te")
  };
}

export default async function GetInvolvedPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("getInvolved");
  const social = siteConfig.social.filter((s) => s.url !== "");

  const benefits = [
    { title: t("benefit1Title"), text: t("benefit1Text") },
    { title: t("benefit2Title"), text: t("benefit2Text") },
    { title: t("benefit3Title"), text: t("benefit3Text") }
  ];

  return (
    <main className="flex-1">
      <section className="bg-sfl-gold py-14 text-center">
        <h1 className="font-display text-5xl font-bold uppercase">{t("title")}</h1>
        <p className="mx-auto mt-4 max-w-2xl px-4 text-lg">{t("intro")}</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center font-display text-3xl font-bold uppercase">
          {t("benefitsTitle")}
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {benefits.map((b) => (
            <div key={b.title} className="border-2 border-sfl-black p-6">
              <h3 className="font-display text-xl font-bold uppercase">{b.title}</h3>
              <p className="mt-2 text-sfl-gray">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-sfl-black py-14 text-center">
        <h2 className="font-display text-3xl font-bold uppercase text-sfl-gold">{t("ctaTitle")}</h2>
        <a
          href={siteConfig.signupFormUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block bg-sfl-gold px-8 py-4 font-display text-lg font-bold uppercase text-sfl-black hover:bg-white"
        >
          {t("ctaButton")}
        </a>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 text-center">
        <h2 className="font-display text-3xl font-bold uppercase">{t("contactTitle")}</h2>
        <p className="mt-3 text-lg text-sfl-gray">{t("contactText")}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          {siteConfig.contactEmail !== "" && (
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="border-2 border-sfl-black px-6 py-3 font-display font-bold uppercase hover:bg-sfl-gold"
            >
              {siteConfig.contactEmail}
            </a>
          )}
          {social.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-sfl-black px-6 py-3 font-display font-bold uppercase hover:bg-sfl-gold"
            >
              {s.name}
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 8: Verify**

Run: `npm run lint && npm run test && npm run build` — Expected: all green.
Run: `npm run dev` — check `/despre-noi` (mission, global section with image, 3 value cards, NO team section), `/implica-te` (benefits, gold CTA button opening the signup URL in a new tab, no email button since contactEmail is empty), and both EN variants (`/en/about`, `/en/get-involved`). Stop dev server.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: about page with team data file and get-involved page with external signup CTA"
```

---

### Task 10: 404, sitemap, robots

**Files:**
- Create: `src/app/[locale]/[...rest]/page.tsx`, `src/app/[locale]/not-found.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`

**Interfaces:**
- Consumes: `notFound` messages, `getAllSlugs`, `getPathname`, `routing`, `siteConfig`.
- Produces: localized 404 for any unknown URL; `/sitemap.xml`; `/robots.txt`.

- [ ] **Step 1: Write the catch-all and not-found pages**

`src/app/[locale]/[...rest]/page.tsx`:
```tsx
import { notFound } from "next/navigation";

export default function CatchAllPage() {
  notFound();
}
```

`src/app/[locale]/not-found.tsx`:
```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFoundPage() {
  const t = useTranslations("notFound");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-sfl-gold px-4 py-24 text-center">
      <h1 className="font-display text-6xl font-bold uppercase">{t("title")}</h1>
      <p className="text-lg">{t("text")}</p>
      <Link
        href="/"
        className="mt-4 bg-sfl-black px-6 py-3 font-display font-bold uppercase text-sfl-gold hover:bg-sfl-gray"
      >
        {t("cta")}
      </Link>
    </main>
  );
}
```

- [ ] **Step 2: Write `src/app/sitemap.ts` and `src/app/robots.ts`**

`src/app/sitemap.ts`:
```ts
import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getAllSlugs } from "@/lib/events";
import { siteConfig } from "@/site.config";

const STATIC_ROUTES = ["/", "/evenimente", "/despre-noi", "/implica-te"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of routing.locales) {
    for (const href of STATIC_ROUTES) {
      entries.push({ url: siteConfig.url + getPathname({ locale, href }) });
    }
    for (const slug of getAllSlugs()) {
      entries.push({
        url:
          siteConfig.url +
          getPathname({ locale, href: { pathname: "/evenimente/[slug]", params: { slug } } })
      });
    }
  }
  return entries;
}
```

`src/app/robots.ts`:
```ts
import type { MetadataRoute } from "next";
import { siteConfig } from "@/site.config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteConfig.url}/sitemap.xml`
  };
}
```

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run test && npm run build` — Expected: all green.
Run: `npm run dev` — check: `/nu-exista` shows the Romanian 404 with working "Înapoi acasă"; `/en/does-not-exist` shows the English 404; `/sitemap.xml` lists 26 URLs (2 locales × (4 static + 9 events)); `/robots.txt` references the sitemap. Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: localized 404, sitemap, and robots"
```

---

### Task 11: README, Docker, final verification

**Files:**
- Create: `README.md`, `Dockerfile`, `.dockerignore`

**Interfaces:**
- Consumes: the finished app.
- Produces: deploy-ready repository.

- [ ] **Step 1: Write `README.md`**

```markdown
# Students for Liberty România — Website

Site-ul oficial SFL România. Next.js 15 + next-intl (RO implicit, EN la `/en`), conținut
bazat pe fișiere — fără CMS, fără bază de date.
/ The official SFL Romania website. Next.js 15 + next-intl (Romanian default, English at
`/en`), file-based content — no CMS, no database.

## Comenzi / Commands

​```bash
npm install      # instalare / install
npm run dev      # dezvoltare / development — http://localhost:3000
npm run check    # lint + teste + build (rulează înainte de push / run before pushing)
​```

## Cum adaugi un eveniment / How to add an event

1. Copiază `content/events/_TEMPLATE` și redenumește folderul `YYYY-MM-numele-evenimentului`.
   / Copy `content/events/_TEMPLATE`, rename it `YYYY-MM-event-name`.
2. Completează `event.json` (slug = numele folderului!), `ro.mdx` ȘI `en.mdx`, pune pozele
   în `images/` și setează `cover`. / Fill in `event.json` (slug = folder name!), BOTH
   `ro.mdx` and `en.mdx`, drop photos into `images/`, set `cover`.
3. `git add . && git commit && git push` — Vercel publică automat. / Vercel deploys automatically.

Detalii complete în `content/events/_TEMPLATE/README.md`. Evenimentele viitoare apar la
„Viitoare" și trec singure la „Trecute". / Full details in `content/events/_TEMPLATE/README.md`.
Future events appear under "Upcoming" and move to "Past" automatically.

Dacă datele sunt greșite (dată invalidă, lipsește o traducere, cover inexistent), build-ul
eșuează cu un mesaj care numește fișierul și câmpul. / If the data is wrong (invalid date,
missing translation, missing cover), the build fails naming the file and field.

## Cum adaugi un membru în echipă / How to add a team member

Editează `content/team.json` / Edit `content/team.json`:

​```json
[
  { "name": "Ana Pop", "role": { "ro": "Președinte", "en": "President" }, "photo": "/images/team/ana.jpg" }
]
​```

Pozele merg în `public/images/team/`. `photo` este opțional. / Photos go in
`public/images/team/`. `photo` is optional.

## Configurare / Configuration — `src/site.config.ts`

Caută `TODO(SFL)` și completează: domeniul de producție (`url`), emailul de contact,
linkul formularului de înscriere, linkurile social media. / Search for `TODO(SFL)` and fill
in: production domain (`url`), contact email, signup form URL, social media links.

## Traduceri / Translations

TOATE textele UI stau în `messages/ro.json` și `messages/en.json` — niciun text hardcodat
în componente (impus de ESLint `react/jsx-no-literals` + teste). Cheile trebuie să existe
în ambele fișiere (test de paritate). / ALL UI text lives in `messages/ro.json` and
`messages/en.json` — no hardcoded strings in components (enforced by ESLint + tests).
Keys must exist in both files (parity test).

## Deploy

### Vercel (acum / now)

1. Urcă repo-ul pe GitHub. / Push the repo to GitHub.
2. [vercel.com/new](https://vercel.com/new) → importă repo-ul → Deploy (zero config;
   framework: Next.js). / import the repo → Deploy (zero config).
3. Adaugă domeniul în Vercel → Settings → Domains și actualizează `url` în
   `src/site.config.ts`. / Add your domain in Vercel and update `url` in `src/site.config.ts`.

Testele rulează automat la fiecare build (`prebuild`) — un eveniment invalid sau o
traducere lipsă blochează publicarea. / Tests run on every build (`prebuild`) — invalid
events or missing translations block the deploy.

### Server propriu / Own server (mai târziu / later)

​```bash
docker build -t sfl-romania .
docker run -p 3000:3000 sfl-romania
​```

Sau fără Docker / Or without Docker: `npm ci && npm run build && npm run start`
(Node >= 20), în spatele unui reverse proxy (nginx/Caddy) cu HTTPS. Nu se folosește
niciun API specific Vercel. / behind a reverse proxy (nginx/Caddy) with HTTPS. No
Vercel-specific APIs are used.
```

(Remove the zero-width `​` characters before the inner code fences — they are only there to keep this plan's markdown valid. The actual README uses normal triple backticks.)

- [ ] **Step 2: Write `Dockerfile` and `.dockerignore`**

`Dockerfile`:
```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

`.dockerignore`:
```
node_modules
.next
.git
.vercel
public/events
```

- [ ] **Step 3: Final verification**

Run: `npm run check`
Expected: lint clean, all tests pass, build succeeds with all routes prerendered.

Manual QA sweep (`npm run dev`):
- `/` and `/en` — hero, cards, strips, all text switches language
- `/evenimente` + tag filter + a detail page + lightbox; same in EN
- Locale switcher on a detail page keeps you on that event
- `/despre-noi`, `/implica-te`, 404 page in both locales
- No raw message keys visible anywhere (a visible `home.heroTitle` means a typo'd key)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: bilingual README, Dockerfile for self-hosting"
```

- [ ] **Step 5: Report to user**

Remind the user of the open items:
1. Fill the `TODO(SFL)` values in `src/site.config.ts` (domain, contact email, signup form, socials).
2. Confirm "NICON" vs "NICOM" in the John Galt School text (docx was inconsistent).
3. Push to GitHub + connect to Vercel when ready.
```
