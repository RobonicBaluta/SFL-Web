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
