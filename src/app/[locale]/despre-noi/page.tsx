import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getTeam } from "@/lib/team";
import { alternatesFor } from "@/lib/seo";

// Set to "/images/global/sfl-global.webp" if Step 5 succeeded, otherwise "/images/sfl-flag.jpg"
const GLOBAL_IMAGE = "/images/global/sfl-global.webp";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("about.title"),
    description: t("about.description"),
    alternates: alternatesFor("/despre-noi")
  };
}

export default async function AboutPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const team = getTeam(locale as "ro" | "en");

  const values = [
    { title: t("value1Title"), text: t("value1Text") },
    { title: t("value2Title"), text: t("value2Text") },
    { title: t("value3Title"), text: t("value3Text") }
  ];

  return (
    <main className="flex-1">
      <section className="bg-sfl-black py-14 text-center">
        <h1 className="font-display text-5xl font-bold uppercase text-sfl-gold">{t("title")}</h1>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14">
        <h2 className="font-display text-3xl font-bold uppercase">{t("missionTitle")}</h2>
        <p className="mt-4 text-lg leading-relaxed">{t("missionText")}</p>
      </section>

      <section className="bg-sfl-black">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold uppercase text-sfl-gold">
              {t("globalTitle")}
            </h2>
            <p className="mt-4 text-lg text-white/90">{t("globalText")}</p>
            <a
              href="https://studentsforliberty.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-block bg-sfl-gold px-6 py-3 font-display font-bold uppercase text-sfl-black hover:bg-white"
            >
              {t("globalCta")}
            </a>
          </div>
          <div className="relative aspect-[3/2] overflow-hidden border-2 border-sfl-gold">
            <Image
              src={GLOBAL_IMAGE}
              alt={t("globalImageAlt")}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center font-display text-3xl font-bold uppercase">{t("valuesTitle")}</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {values.map((v) => (
            <div key={v.title} className="border-2 border-sfl-black bg-sfl-gold p-6">
              <h3 className="font-display text-xl font-bold uppercase">{v.title}</h3>
              <p className="mt-2">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {team.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-14">
          <h2 className="text-center font-display text-3xl font-bold uppercase">{t("teamTitle")}</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {team.map((m) => (
              <div key={m.name} className="border-2 border-sfl-black p-4 text-center">
                {m.photo && (
                  <div className="relative mx-auto mb-3 aspect-square w-32 overflow-hidden rounded-full">
                    <Image src={m.photo} alt={m.name} fill sizes="128px" className="object-cover" />
                  </div>
                )}
                <p className="font-display text-lg font-bold uppercase">{m.name}</p>
                <p className="text-sm text-sfl-gray">{m.role}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
