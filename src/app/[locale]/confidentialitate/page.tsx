import { MDXRemote } from "next-mdx-remote/rsc";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { assertLocale } from "@/i18n/locale";
import { formatEventDate } from "@/lib/dates";
import { getPage } from "@/lib/pages";
import { PROSE_CLASSES } from "@/lib/prose";
import { pageMetadata } from "@/lib/seo";

// The text lives in content/pages/confidentialitate/{ro,en}.mdx.
const PAGE = "confidentialitate";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  const page = getPage(PAGE, locale);
  return pageMetadata(locale, "/confidentialitate", {
    title: page.title,
    description: page.description
  });
}

export default async function PrivacyPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("privacy");
  const page = getPage(PAGE, locale);

  return (
    <main className="flex-1">
      <section className="bg-sfl-black py-14 text-center">
        <h1 className="px-4 font-display text-4xl font-bold uppercase text-sfl-gold md:text-5xl">
          {page.title}
        </h1>
        <p className="mt-4 px-4 text-white/80">
          {t("updated", { date: formatEventDate(locale, page.updated) })}
        </p>
      </section>
      <article className={`mx-auto max-w-3xl px-4 py-12 ${PROSE_CLASSES}`}>
        <MDXRemote source={page.body} />
      </article>
    </main>
  );
}
