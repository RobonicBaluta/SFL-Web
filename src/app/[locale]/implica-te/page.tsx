import { getTranslations, setRequestLocale } from "next-intl/server";
import { assertLocale } from "@/i18n/locale";
import { alternatesFor } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("getInvolved.title"),
    description: t("getInvolved.description"),
    alternates: alternatesFor(locale, "/implica-te")
  };
}

export default async function GetInvolvedPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("getInvolved");
  const social = siteConfig.social.filter((s) => s.url !== "");

  const benefits = [
    { title: t("benefit1Title"), text: t("benefit1Text") },
    { title: t("benefit2Title"), text: t("benefit2Text") },
    { title: t("benefit3Title"), text: t("benefit3Text") }
  ];

  return (
    <main className="flex-1">
      <section className="bg-sfl-gold py-14 text-center">
        <h1 className="font-display text-5xl font-bold uppercase">{t("title")}</h1>
        <p className="mx-auto mt-4 max-w-2xl px-4 text-lg">{t("intro")}</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center font-display text-3xl font-bold uppercase">
          {t("benefitsTitle")}
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {benefits.map((b) => (
            <div key={b.title} className="border-2 border-sfl-black p-6">
              <h3 className="font-display text-xl font-bold uppercase">{b.title}</h3>
              <p className="mt-2 text-sfl-gray">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-sfl-black py-14 text-center">
        <h2 className="font-display text-3xl font-bold uppercase text-sfl-gold">{t("ctaTitle")}</h2>
        <a
          href={siteConfig.signupFormUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block bg-sfl-gold px-8 py-4 font-display text-lg font-bold uppercase text-sfl-black hover:bg-white"
        >
          {t("ctaButton")}
        </a>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 text-center">
        <h2 className="font-display text-3xl font-bold uppercase">{t("contactTitle")}</h2>
        <p className="mt-3 text-lg text-sfl-gray">{t("contactText")}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          {siteConfig.contactEmail !== "" && (
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="border-2 border-sfl-black px-6 py-3 font-display font-bold uppercase hover:bg-sfl-gold"
            >
              {siteConfig.contactEmail}
            </a>
          )}
          {social.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-sfl-black px-6 py-3 font-display font-bold uppercase hover:bg-sfl-gold"
            >
              {s.name}
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
