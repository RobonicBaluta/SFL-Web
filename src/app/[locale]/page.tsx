import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import EventCard from "@/components/EventCard";
import { assertLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { toCardData } from "@/lib/cards";
import { formatEventDate } from "@/lib/dates";
import { getAllEvents, splitEvents } from "@/lib/events";
import { alternatesFor } from "@/lib/seo";

export const revalidate = 3600;

const COLLAGE = [
  "/events/2026-04-lrr-bucuresti/IMG_3622.JPG",
  "/events/2026-05-lrr-chisinau/DJI_20260516144106_0049_D.JPEG",
  "/events/2026-07-securitatea-marii-negre-constanta/IMG_6146.JPG",
  "/events/2026-05-lrr-cluj-napoca/IMG_3880.JPG"
] as const;

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    description: t("defaultDescription"),
    alternates: alternatesFor(locale, "/")
  };
}

export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tTags = await getTranslations("tags");

  const { upcoming, past } = splitEvents(getAllEvents(locale), new Date());
  const nextEvent = upcoming[0];
  const latest = past.slice(0, 3).map((e) => toCardData(e, locale, (k) => tTags(k)));

  return (
    <main className="flex-1">
      <section className="bg-sfl-gold">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <h1 className="font-display text-4xl font-bold uppercase leading-tight md:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 max-w-md text-lg">{t("heroSubtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/implica-te"
                className="bg-sfl-black px-6 py-3 font-display font-bold uppercase text-sfl-gold transition-colors hover:bg-sfl-gray"
              >
                {t("heroCta")}
              </Link>
              <Link
                href="/evenimente"
                className="border-2 border-sfl-black px-6 py-3 font-display font-bold uppercase transition-colors hover:bg-sfl-black hover:text-sfl-gold"
              >
                {t("heroSecondaryCta")}
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {COLLAGE.map((src, i) => (
              <div key={src} className="relative aspect-square overflow-hidden border-2 border-sfl-black">
                <Image
                  src={src}
                  alt={`${t("collageAlt")} ${i + 1}`}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover"
                  priority={i < 2}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {nextEvent && (
        <section className="bg-sfl-black py-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4">
            <div>
              <p className="font-display text-sm font-bold uppercase text-sfl-gold">
                {t("nextEventLabel")}
              </p>
              <p className="font-display text-2xl font-bold uppercase text-white">
                {nextEvent.title}
                <span className="text-sfl-gold"> • </span>
                <span className="text-white/80">
                  {formatEventDate(locale, nextEvent.date, nextEvent.endDate)}
                </span>
              </p>
            </div>
            <Link
              href={{ pathname: "/evenimente/[slug]", params: { slug: nextEvent.slug } }}
              className="bg-sfl-gold px-6 py-3 font-display font-bold uppercase text-sfl-black hover:bg-white"
            >
              {t("nextEventCta")}
            </Link>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-display text-3xl font-bold uppercase">{t("latestTitle")}</h2>
          <Link
            href="/evenimente"
            className="font-display text-sm font-bold uppercase text-sfl-gray hover:text-sfl-black"
          >
            {t("latestCta")}
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((e) => (
            <EventCard key={e.slug} event={e} />
          ))}
        </div>
      </section>

      <section className="bg-sfl-black py-14">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold uppercase text-sfl-gold">
            {t("aboutTitle")}
          </h2>
          <p className="mt-4 text-lg text-white/90">{t("aboutText")}</p>
          <Link
            href="/despre-noi"
            className="mt-6 inline-block border-2 border-sfl-gold px-6 py-3 font-display font-bold uppercase text-sfl-gold transition-colors hover:bg-sfl-gold hover:text-sfl-black"
          >
            {t("aboutCta")}
          </Link>
        </div>
      </section>

      <section className="bg-sfl-gold py-14">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold uppercase">{t("joinTitle")}</h2>
          <p className="mt-3 text-lg">{t("joinText")}</p>
          <Link
            href="/implica-te"
            className="mt-6 inline-block bg-sfl-black px-8 py-3 font-display font-bold uppercase text-sfl-gold hover:bg-sfl-gray"
          >
            {t("joinCta")}
          </Link>
        </div>
      </section>
    </main>
  );
}
