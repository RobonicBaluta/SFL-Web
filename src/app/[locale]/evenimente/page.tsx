import { getTranslations, setRequestLocale } from "next-intl/server";
import EventsExplorer from "@/components/EventsExplorer";
import { toCardData } from "@/lib/cards";
import { getAllEvents, splitEvents, type Locale, type SflEvent } from "@/lib/events";
import { alternatesFor } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("events.title"),
    description: t("events.description"),
    alternates: alternatesFor("/evenimente")
  };
}

export default async function EventsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("events");
  const tTags = await getTranslations("tags");

  const { upcoming, past } = splitEvents(getAllEvents(locale as Locale), new Date());
  const map = (list: SflEvent[]) =>
    list.map((e) => toCardData(e, locale as Locale, (key) => tTags(key)));

  return (
    <main className="flex-1">
      <section className="bg-sfl-black py-14 text-center">
        <h1 className="font-display text-5xl font-bold uppercase text-sfl-gold">{t("title")}</h1>
        <p className="mx-auto mt-4 max-w-2xl px-4 text-white/90">{t("intro")}</p>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-10">
        <EventsExplorer upcoming={map(upcoming)} past={map(past)} />
      </section>
    </main>
  );
}
