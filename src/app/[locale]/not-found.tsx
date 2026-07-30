import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFoundPage() {
  const t = useTranslations("notFound");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-sfl-gold px-4 py-24 text-center">
      <h1 className="font-display text-6xl font-bold uppercase">{t("title")}</h1>
      <p className="text-lg">{t("text")}</p>
      <Link
        href="/"
        className="mt-4 bg-sfl-black px-6 py-3 font-display font-bold uppercase text-sfl-gold hover:bg-sfl-gray"
      >
        {t("cta")}
      </Link>
    </main>
  );
}
