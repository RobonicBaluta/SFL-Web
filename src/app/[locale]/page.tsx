import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  return (
    <main className="flex flex-1 items-center justify-center bg-sfl-gold px-4">
      <h1 className="text-center font-display text-5xl font-bold uppercase">
        {t("heroTitle")}
      </h1>
    </main>
  );
}
