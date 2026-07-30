import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/site.config";

const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/evenimente", key: "events" },
  { href: "/despre-noi", key: "about" },
  { href: "/implica-te", key: "getInvolved" }
] as const;

export default async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const social = siteConfig.social.filter((s) => s.url !== "");

  return (
    <footer className="bg-sfl-black text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-3">
        <div className="flex flex-col items-start gap-3">
          <Image src="/images/sfl-romania-logo.png" alt={tNav("logoAlt")} width={56} height={56} />
          <p className="font-display text-xl font-bold uppercase text-sfl-gold">{t("tagline")}</p>
        </div>

        <div>
          <h2 className="mb-3 font-display font-bold uppercase text-sfl-gold">{t("menuTitle")}</h2>
          <ul className="space-y-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="hover:text-sfl-gold">
                  {tNav(item.key)}
                </Link>
              </li>
            ))}
            <li>
              <a
                href="https://studentsforliberty.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-sfl-gold"
              >
                {t("globalLink")}
              </a>
            </li>
          </ul>
        </div>

        <div>
          {social.length > 0 && (
            <>
              <h2 className="mb-3 font-display font-bold uppercase text-sfl-gold">
                {t("followTitle")}
              </h2>
              <ul className="mb-6 space-y-2">
                {social.map((s) => (
                  <li key={s.name}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-sfl-gold">
                      {s.name}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
          {siteConfig.contactEmail !== "" && (
            <>
              <h2 className="mb-3 font-display font-bold uppercase text-sfl-gold">
                {t("contactTitle")}
              </h2>
              <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-sfl-gold">
                {siteConfig.contactEmail}
              </a>
            </>
          )}
        </div>
      </div>
      <div className="border-t border-sfl-gray/40 py-4 text-center text-sm text-white/70">
        {t("rights", { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
