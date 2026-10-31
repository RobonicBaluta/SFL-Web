import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatEventDate } from "@/lib/dates";
import type { Locale, SflEvent } from "@/lib/events";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
      <dt className="w-28 shrink-0 font-display text-sm font-bold uppercase text-white/60">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

export default async function NextEvent({ event, locale }: { event: SflEvent; locale: Locale }) {
  const t = await getTranslations("home");
  const tDetail = await getTranslations("eventDetail");
  const href = { pathname: "/evenimente/[slug]" as const, params: { slug: event.slug } };
  const location = [event.venue, event.city].filter(Boolean).join(", ");

  return (
    <section className="bg-sfl-black py-14 text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-[2fr_3fr]">
        {/* Upcoming covers are usually posters with text baked in, so the whole
            image is shown (contain) rather than cropped like the event cards. */}
        <Link
          href={href}
          className="relative mx-auto block aspect-[4/5] w-full max-w-sm transition-opacity hover:opacity-90 md:max-w-none"
        >
          <Image
            src={event.coverUrl}
            alt={event.title}
            fill
            sizes="(min-width: 768px) 40vw, 100vw"
            className="object-contain"
          />
        </Link>

        <div>
          <p className="font-display text-sm font-bold uppercase tracking-wide text-sfl-gold">
            {t("nextEventLabel")}
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold uppercase leading-tight md:text-4xl">
            {event.title}
          </h2>

          <dl className="mt-6 space-y-3 border-l-4 border-sfl-gold pl-4">
            <Row label={event.endDate ? tDetail("period") : tDetail("date")}>
              {formatEventDate(locale, event.date, event.endDate)}
            </Row>
            {location !== "" && <Row label={tDetail("location")}>{location}</Row>}
            {event.speakers.length > 0 && (
              <Row label={tDetail("speakers")}>
                <ul>
                  {event.speakers.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </Row>
            )}
          </dl>

          <p className="mt-6 text-lg text-white/80">{event.excerpt}</p>

          <Link
            href={href}
            className="mt-8 inline-block bg-sfl-gold px-6 py-3 font-display font-bold uppercase text-sfl-black hover:bg-white"
          >
            {t("nextEventCta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
