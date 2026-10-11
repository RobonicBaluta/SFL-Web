// No Node imports: the admin form uses these in the browser too.

const MAX_SLUG_PART = 60;

/** "Chat Control: o discuție" → "chat-control-o-discutie" (ASCII, lowercase, dashes). */
function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_PART)
    .replace(/-+$/, "");
}

/** Folder name and public URL of a new event: "YYYY-MM-<romanian-title>". */
export function eventSlug(date: string, titleRo: string): string {
  if (!/^\d{4}-\d{2}/.test(date)) return "";
  return `${date.slice(0, 7)}-${slugify(titleRo) || "eveniment"}`;
}

/** File name for an uploaded photo (always re-encoded as JPEG), unique among `taken`. */
export function photoName(original: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = slugify(original.replace(/\.[^.]*$/, "")) || "foto";
  let name = `${base}.jpg`;
  for (let n = 2; used.has(name); n++) name = `${base}-${n}.jpg`;
  return name;
}
