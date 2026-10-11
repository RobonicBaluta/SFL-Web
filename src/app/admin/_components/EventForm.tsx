"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { EventDraft, LocaleText, Localized } from "@/lib/admin/draft";
import { eventSlug, photoName } from "@/lib/admin/naming";
import { resizePhoto } from "../_lib/resize-photo";
import CoverFraming from "./CoverFraming";
import DeployStatus from "./DeployStatus";

type Tag = { key: string; label: string };
type NewPhoto = { name: string; sha: string; preview: string };
type Locale = "ro" | "en";
type ListField = "speakers" | "moderators" | "partners" | "sponsors";

const LANGUAGES: [Locale, string][] = [
  ["ro", "Romanian"],
  ["en", "English"]
];
const LISTS: [ListField, string][] = [
  ["speakers", "Speakers"],
  ["moderators", "Moderators"],
  ["partners", "Partners"],
  ["sponsors", "Sponsors"]
];

const inputClass = "mt-1 w-full border-2 border-sfl-black bg-white px-3 py-2";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 border-2 border-sfl-black bg-white p-4 md:p-6">
      <h2 className="font-display text-xl font-bold uppercase">{title}</h2>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-sfl-gray">{hint}</span>}
    </label>
  );
}

export default function EventForm({
  mode,
  initial,
  tags,
  takenSlugs,
  savedSha
}: {
  mode: "create" | "edit";
  initial: EventDraft;
  tags: Tag[];
  takenSlugs: string[];
  savedSha?: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [slugEdited, setSlugEdited] = useState(false);
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [uploading, setUploading] = useState(0);
  const [photoErrors, setPhotoErrors] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [deploySha, setDeploySha] = useState(savedSha);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Names already in the repository or handed out in this session, so a new
  // photo can never overwrite an existing file.
  const takenNames = useRef(new Set(initial.images));

  const dirty = JSON.stringify(draft) !== baseline || newPhotos.length > 0;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (patch: Partial<EventDraft>) => setDraft((d) => ({ ...d, ...patch }));

  /** While creating, the address follows the date and Romanian title until edited by hand. */
  function updateWithSlug(patch: Partial<EventDraft>) {
    setDraft((d) => {
      const next = { ...d, ...patch };
      if (mode === "create" && !slugEdited) next.slug = eventSlug(next.date, next.ro.title);
      return next;
    });
  }

  const setText = (locale: Locale, key: keyof LocaleText, value: string) => {
    const patch = { [locale]: { ...draft[locale], [key]: value } } as Partial<EventDraft>;
    if (locale === "ro" && key === "title") updateWithSlug(patch);
    else update(patch);
  };
  const setPlace = (field: "city" | "venue", locale: Locale, value: string) =>
    update({ [field]: { ...draft[field], [locale]: value } as Localized });

  const previews = new Map(newPhotos.map((p) => [p.name, p.preview]));
  const photoSrc = (name: string) =>
    previews.get(name) ??
    `/api/admin/photo?slug=${encodeURIComponent(initial.slug)}&name=${encodeURIComponent(name)}`;

  async function addPhotos(files: File[]) {
    setPhotoErrors([]);
    setUploading((n) => n + files.length);
    for (const file of files) {
      try {
        const { base64, preview } = await resizePhoto(file);
        const res = await fetch("/api/admin/photo", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ data: base64 })
        });
        const body = (await res.json().catch(() => ({}))) as { sha?: string; error?: string };
        if (!res.ok || !body.sha) throw new Error(`${file.name}: ${body.error ?? `upload failed (${res.status})`}`);
        const name = photoName(file.name, takenNames.current);
        takenNames.current.add(name);
        setNewPhotos((list) => [...list, { name, sha: body.sha!, preview }]);
        setDraft((d) => ({ ...d, images: [...d.images, name], cover: d.cover || name }));
      } catch (e) {
        setPhotoErrors((list) => [...list, (e as Error).message]);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  function removePhoto(name: string) {
    setDraft((d) => {
      const images = d.images.filter((n) => n !== name);
      return { ...d, images, cover: d.cover === name ? (images[0] ?? "") : d.cover };
    });
    setNewPhotos((list) => list.filter((p) => p.name !== name));
  }

  async function post(url: string, payload: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = (await res.json().catch(() => ({}))) as {
      sha?: string;
      slug?: string;
      error?: string;
      errors?: string[];
    };
    if (!res.ok) setErrors(body.errors ?? [body.error ?? `Something went wrong (${res.status}).`]);
    return res.ok ? body : null;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors([]);
    const result = await post("/api/admin/save", {
      mode,
      draft,
      newPhotos: newPhotos.map(({ name, sha }) => ({ name, sha }))
    });
    if (!result) {
      setBusy(false);
      return;
    }
    if (mode === "create") {
      // Keep the local previews: until navigation completes, the thumbnails
      // would otherwise ask for photos of an event with no address yet.
      router.push(`/admin/edit/${result.slug}?saved=${result.sha}`);
      return;
    }
    setBaseline(JSON.stringify(draft));
    setNewPhotos([]);
    setDeploySha(result.sha);
    setBusy(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteEvent() {
    setBusy(true);
    setErrors([]);
    const result = await post("/api/admin/delete", { slug: draft.slug });
    if (!result) {
      setBusy(false);
      return;
    }
    setBaseline(JSON.stringify(draft));
    router.push(`/admin?deleted=${result.sha}`);
  }

  const slugTaken = mode === "create" && takenSlugs.includes(draft.slug);
  const gallery = [...draft.images].sort();

  return (
    <form onSubmit={save}>
      {deploySha && <DeployStatus key={deploySha} sha={deploySha} viewHref={`/evenimente/${draft.slug}`} />}
      <Link href="/admin" className="text-sm font-semibold underline">
        ← All events
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold uppercase">
        {mode === "create" ? "New event" : draft.ro.title || draft.slug}
      </h1>

      <Section title="When">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date">
            <input
              type="date"
              required
              value={draft.date}
              onChange={(e) => updateWithSlug({ date: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="End date (optional)" hint="Only for events that last several days.">
            <input
              type="date"
              min={draft.date}
              value={draft.endDate}
              onChange={(e) => update({ endDate: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
        <p className="text-xs text-sfl-gray">
          There is no separate time field: write the time in the text (e.g. &quot;de la ora 17:00&quot;).
        </p>
      </Section>

      <Section title="Text">
        <div className="grid gap-6 md:grid-cols-2">
          {LANGUAGES.map(([locale, language]) => (
            <div key={locale} className="space-y-4">
              <h3 className="font-display text-lg font-bold uppercase text-sfl-gray">{language}</h3>
              <Field label="Title">
                <input
                  required
                  maxLength={200}
                  value={draft[locale].title}
                  onChange={(e) => setText(locale, "title", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Short summary" hint="One or two sentences, shown on the event card.">
                <textarea
                  required
                  rows={3}
                  maxLength={400}
                  value={draft[locale].excerpt}
                  onChange={(e) => setText(locale, "excerpt", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field
                label="Text"
                hint='Blank line = new paragraph. **bold**, [link text](https://…), lines starting with "- " make a list.'
              >
                <textarea
                  required
                  rows={12}
                  maxLength={20000}
                  value={draft[locale].body}
                  onChange={(e) => setText(locale, "body", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          ))}
        </div>
        {mode === "create" ? (
          <Field
            label="Web address"
            hint="Filled in from the date and the Romanian title. It can't be changed after saving."
          >
            <input
              required
              pattern="\d{4}-\d{2}-[a-z0-9\-]+"
              value={draft.slug}
              onChange={(e) => {
                setSlugEdited(true);
                update({ slug: e.target.value });
              }}
              className={inputClass}
            />
            <span className="mt-1 block text-xs text-sfl-gray">/evenimente/{draft.slug || "…"}</span>
            {slugTaken && (
              <span className="mt-1 block text-sm font-semibold text-red-700">
                Another event already uses this address.
              </span>
            )}
          </Field>
        ) : (
          <p className="text-sm">
            Web address: <span className="font-semibold">/evenimente/{draft.slug}</span>
          </p>
        )}
      </Section>

      <Section title="Place">
        <p className="text-xs text-sfl-gray">Leave English empty when it&apos;s the same as Romanian.</p>
        {(["city", "venue"] as const).map((field) => (
          <div key={field} className="grid gap-4 sm:grid-cols-2">
            {LANGUAGES.map(([locale, language]) => (
              <Field key={locale} label={`${field === "city" ? "City" : "Venue"} (${language})`}>
                <input
                  maxLength={200}
                  value={draft[field][locale]}
                  onChange={(e) => setPlace(field, locale, e.target.value)}
                  className={inputClass}
                />
              </Field>
            ))}
          </div>
        ))}
      </Section>

      <Section title="People">
        <div className="grid gap-4 sm:grid-cols-2">
          {LISTS.map(([field, label]) => (
            <Field key={field} label={label} hint="One name per line.">
              <textarea
                rows={3}
                value={draft[field].join("\n")}
                onChange={(e) => update({ [field]: e.target.value.split("\n") })}
                className={inputClass}
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Tags">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {tags.map((tag) => (
            <label key={tag.key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.tags.includes(tag.key)}
                onChange={(e) =>
                  update({
                    tags: e.target.checked
                      ? [...draft.tags, tag.key]
                      : draft.tags.filter((t) => t !== tag.key)
                  })
                }
                className="h-5 w-5 accent-sfl-gold"
              />
              {tag.label}
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 border-t-2 border-neutral-200 pt-4">
          <input
            type="checkbox"
            checked={draft.external}
            onChange={(e) => update({ external: e.target.checked })}
            className="h-5 w-5 accent-sfl-gold"
          />
          Organized by another group (shows an &quot;External&quot; badge)
        </label>
      </Section>

      <Section title="Photos">
        <p className="text-xs text-sfl-gray">
          The site shows photos in alphabetical order of their names, as below. The cover appears
          on the event card and at the top of the event page.
        </p>
        {gallery.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {gallery.map((name) => (
              <li key={name} className="border-2 border-sfl-black bg-white">
                <img src={photoSrc(name)} alt={name} className="aspect-[4/3] w-full object-cover" />
                <div className="space-y-1 p-2 text-xs">
                  <p className="truncate" title={name}>
                    {name}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    {draft.cover === name ? (
                      <span className="bg-sfl-gold px-1 font-bold uppercase">Cover</span>
                    ) : (
                      <button type="button" onClick={() => update({ cover: name })} className="underline">
                        Use as cover
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(name)}
                      className="font-semibold text-red-700 underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <label className="inline-block cursor-pointer border-2 border-sfl-black bg-sfl-gold px-4 py-2 font-display font-bold uppercase">
          + Add photos
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length > 0) addPhotos(files);
            }}
          />
        </label>
        {uploading > 0 && (
          <p className="text-sm" role="status">
            Uploading {uploading} {uploading === 1 ? "photo" : "photos"}…
          </p>
        )}
        {photoErrors.length > 0 && (
          <ul className="list-disc pl-6 text-sm text-red-700" role="alert">
            {photoErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}
      </Section>

      {draft.cover && (
        <Section title="Cover framing">
          <CoverFraming
            src={photoSrc(draft.cover)}
            position={draft.coverPosition}
            onChange={(coverPosition) => update({ coverPosition })}
          />
        </Section>
      )}

      <div className="sticky bottom-0 mt-6 border-t-4 border-sfl-gold bg-neutral-100 py-4">
        {errors.length > 0 && (
          <ul className="mb-3 list-disc border-2 border-red-700 bg-red-50 py-2 pl-8 pr-3 text-sm text-red-800" role="alert">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={busy || uploading > 0}
            className="bg-sfl-black px-6 py-3 font-display font-bold uppercase text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : mode === "create" ? "Publish event" : "Save changes"}
          </button>
          {uploading > 0 && <span className="text-sm">Wait for the photos to finish uploading.</span>}
          {mode === "edit" && !dirty && !busy && <span className="text-sm text-sfl-gray">No unsaved changes.</span>}
        </div>
      </div>

      {mode === "edit" && (
        <section className="mt-10 border-2 border-red-700 bg-white p-4">
          <h2 className="font-display text-lg font-bold uppercase text-red-700">Delete event</h2>
          {confirmDelete ? (
            <div className="mt-2 space-y-3">
              <p className="text-sm">
                This removes the event, its text and all its photos from the site. It can only be
                undone by a developer.
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  disabled={busy}
                  onClick={deleteEvent}
                  className="bg-red-700 px-4 py-2 font-bold text-white disabled:opacity-50"
                >
                  Yes, delete it
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="underline">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="mt-2 text-sm font-semibold text-red-700 underline">
              Delete this event…
            </button>
          )}
        </section>
      )}
    </form>
  );
}
