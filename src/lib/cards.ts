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
