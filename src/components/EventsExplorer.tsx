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
