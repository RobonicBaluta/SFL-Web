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
5. `coverPosition` decide ce parte a imaginii rămâne vizibilă după decupare (implicit
   `center`). Dacă se taie capetele oamenilor, folosește `top`. Valori permise: `top`,
   `center`, `bottom`, `left`, `right` sau procente `"X% Y%"` măsurate din colțul
   stânga-sus (ex. `"50% 25%"` coboară puțin cadrul). / `coverPosition` decides which part
   of the image stays visible after cropping (default `center`). If heads get cut off, use
   `top`. Allowed: `top`, `center`, `bottom`, `left`, `right`, or `"X% Y%"` percentages
   measured from the top-left corner (e.g. `"50% 25%"`).
6. Șterge acest README din copia ta, apoi commit + push. Vercel publică automat.
   / Delete this README from your copy, then commit + push. Vercel deploys automatically.

Evenimentele cu data în viitor apar la „Viitoare" și trec singure la „Trecute" după ce
data trece. / Events with a future date appear under "Upcoming" and move to "Past"
automatically once the date passes.
