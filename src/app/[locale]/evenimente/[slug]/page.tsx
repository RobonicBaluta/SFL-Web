import Image from "next/image";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getTranslations, setRequestLocale } from "next-intl/server";
import EventInfo from "@/components/EventInfo";
import Gallery from "@/components/Gallery";
import { assertLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { getAllSlugs, getEventBySlug } from "@/lib/events";
import { alternatesFor } from "@/lib/seo";

export const dynamicParams = false;

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
  return {
    title: event.title,
    description: event.excerpt,
    alternates: alternatesFor(locale, { pathname: "/evenimente/[slug]", params: { slug } }),
    openGraph: { images: [event.coverUrl] }
  };
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

  return (
    <main className="flex-1">
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

        <div className="mt-8 text-lg leading-relaxed [&_p]:mb-5">
          <MDXRemote source={event.body} />
        </div>

        <h2 className="mb-4 mt-12 font-display text-2xl font-bold uppercase">{t("gallery")}</h2>
        <Gallery images={event.images} title={event.title} />
      </article>
    </main>
  );
}
