import en from "../../../messages/en.json";
import ro from "../../../messages/ro.json";

// A tag can only be used if both languages translate it (see tests/content.test.ts).
const roTags = ro.tags as Record<string, string>;
const enTags = en.tags as Record<string, string>;

/** The tags the admin form offers, labelled in English. */
export const ADMIN_TAGS = Object.keys(roTags)
  .filter((key) => enTags[key])
  .map((key) => ({ key, label: enTags[key] }));

export const KNOWN_TAG_KEYS = ADMIN_TAGS.map((t) => t.key);
