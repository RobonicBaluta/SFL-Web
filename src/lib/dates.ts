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
