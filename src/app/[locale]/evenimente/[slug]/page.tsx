import Image from "next/image";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getTranslations, setRequestLocale } from "next-intl/server";
import EventInfo from "@/components/EventInfo";
import Gallery from "@/components/Gallery";
import JsonLd from "@/components/JsonLd";
import { assertLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { getAllSlugs, getEventBySlug, isUpcoming } from "@/lib/events";
import { PROSE_CLASSES } from "@/lib/prose";
import { pageMetadata } from "@/lib/seo";
import { eventJsonLd } from "@/lib/structured-data";

export const dynamicParams = false;
// Hourly, like the event lists, so the Register button goes away once the event is over.
export const revalidate = 3600;

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = assertLocale(rawLocale);
  if (!getAllSlugs().includes(slug)) notFound();
  const event = getEventBySlug(slug, locale);
  return pageMetadata(
    locale,
    { pathname: "/evenimente/[slug]", params: { slug } },
    { title: event.title, description: event.excerpt, image: event.coverUrl }
  );
}

export default async function EventPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = assertLocale(rawLocale);
  if (!getAllSlugs().includes(slug)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("eventDetail");
  const event = getEventBySlug(slug, locale);
  const structuredData = eventJsonLd(event, locale);

  return (
    <main className="flex-1">
      {structuredData && <JsonLd data={structuredData} />}
      <div className="relative flex min-h-[min(42.857vw,420px)] w-full items-end overflow-hidden">
        <Image
          src={event.coverUrl}
          alt={event.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: event.coverPosition }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sfl-black/80 to-transparent" />
        <h1 className="relative mx-auto w-full max-w-4xl px-4 pb-6 font-display text-3xl font-bold uppercase text-white md:text-5xl">
          {event.title}
        </h1>
      </div>

      <article className="mx-auto max-w-4xl px-4 py-10">
        <Link
          href="/evenimente"
          className="font-display text-sm font-bold uppercase text-sfl-gray hover:text-sfl-black"
        >
          {t("backToEvents")}
        </Link>

        <div className="mt-6">
          <EventInfo event={event} locale={locale} />
        </div>

        {event.registrationUrl && isUpcoming(event, new Date()) && (
          <a
            href={event.registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block bg-sfl-black px-8 py-3 font-display font-bold uppercase text-sfl-gold hover:bg-sfl-gray"
          >
            {t("register")}
          </a>
        )}

        <div className={`mt-8 ${PROSE_CLASSES}`}>
          <MDXRemote source={event.body} />
        </div>

        <h2 className="mb-4 mt-12 font-display text-2xl font-bold uppercase">{t("gallery")}</h2>
        <Gallery images={event.images} title={event.title} />
      </article>
    </main>
  );
}
