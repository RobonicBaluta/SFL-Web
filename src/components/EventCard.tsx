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
