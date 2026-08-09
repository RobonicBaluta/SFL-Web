# Students for Liberty România — Website

Site-ul oficial SFL România. Next.js 15 + next-intl (RO implicit, EN la `/en`), conținut
bazat pe fișiere — fără CMS, fără bază de date.
/ The official SFL Romania website. Next.js 15 + next-intl (Romanian default, English at
`/en`), file-based content — no CMS, no database.

## Comenzi / Commands

```bash
npm install      # instalare / install
npm run dev      # dezvoltare / development — http://localhost:3000
npm run check    # lint + teste + build (rulează înainte de push / run before pushing)
```

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

```json
[
  { "name": "Ana Pop", "role": { "ro": "Președinte", "en": "President" }, "photo": "/images/team/ana.jpg" }
]
```

Pozele merg în `public/images/team/`. `photo` este opțional. / Photos go in
`public/images/team/`. `photo` is optional.

## Cum adaugi postări Instagram / How to add Instagram posts

Postările afișate pe pagina principală sunt listate în `content/instagram.json`.
Imaginile sunt descărcate o singură dată și salvate în repository — site-ul publicat
nu contactează niciodată Instagram. / The posts shown on the home page are listed in
`content/instagram.json`. Images are downloaded once and committed — the published
site never calls Instagram.

### Varianta simplă, fără cont de dezvoltator / The simple way, no developer account

1. În aplicația Instagram: postare → Share → Copy link.
   / In the Instagram app: post → Share → Copy link.
2. Adaugă linkul în `content/instagram.json` / Add the link to `content/instagram.json`:

```json
{ "posts": [{ "url": "https://www.instagram.com/p/XXXXXXXX/" }] }
```

3. `npm run instagram:fetch` — descarcă imaginea, descrierea și data.
   / downloads the image, caption and date.
4. `git add . && git commit && git push` — Vercel publică automat.
   / Vercel deploys automatically.

Adaugă `"pinned": true` unei postări ca să rămână afișată chiar dacă apar altele mai
noi. Se afișează primele 4. / Add `"pinned": true` to keep a post from being rotated
out by newer ones. The first 4 are displayed.

### Varianta automată, cu token / The automatic way, with a token

Necesită un cont Instagram de tip Creator sau Business (conturile personale nu au acces
la API). / Requires a Creator or Business Instagram account (personal accounts have no
API access).

1. Instagram → Settings → Account type → switch to Creator.
2. developers.facebook.com → creează o aplicație → adaugă produsul Instagram → generează
   un token de lungă durată. / create an app → add the Instagram product → generate a
   long-lived token.
3. Creează `.env.local` (nu se urcă niciodată în git / never committed):

```
INSTAGRAM_TOKEN=...
```

4. `npm run instagram:fetch` — aduce automat cele mai noi postări.
   / automatically pulls the newest posts.

Tokenul expiră după ~60 de zile. Expirarea NU afectează site-ul publicat — doar scriptul
îți va cere un token nou. / The token expires after ~60 days. Expiry does NOT affect the
live site — only the script will ask for a fresh one.

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

```bash
docker build -t sfl-romania .
docker run -p 3000:3000 sfl-romania
```

Sau fără Docker / Or without Docker: `npm ci && npm run build && npm run start`
(Node >= 20), în spatele unui reverse proxy (nginx/Caddy) cu HTTPS. Nu se folosește
niciun API specific Vercel. / behind a reverse proxy (nginx/Caddy) with HTTPS. No
Vercel-specific APIs are used.
