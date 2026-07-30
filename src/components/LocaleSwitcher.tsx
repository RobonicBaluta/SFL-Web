"use client";

import NextLink from "next/link";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { matchRoute } from "@/i18n/match-route";
import { getPathname, usePathname } from "@/i18n/navigation";
import { LOCALE_COOKIE, routing } from "@/i18n/routing";

const LABELS: Record<string, string> = { ro: "RO", en: "EN" };

/**
 * next-intl's middleware detects the locale from `LOCALE_COOKIE` when the
 * pathname carries no prefix, so switching to the unprefixed default locale
 * only works if the cookie follows along on a client-side navigation.
 */
function rememberLocale(locale: string) {
  document.cookie = `${LOCALE_COOKIE.name}=${locale};path=${LOCALE_COOKIE.path};samesite=${LOCALE_COOKIE.sameSite}`;
}

export default function LocaleSwitcher() {
  const pathname = usePathname();
  const params = useParams();
  const locale = useLocale();
  const route = matchRoute(pathname, params);

  return (
    <div className="flex items-center gap-1 font-display text-sm font-bold">
      {routing.locales.map((l) => (
        <NextLink
          key={l}
          href={getPathname({ locale: l, href: route })}
          hrefLang={l}
          prefetch={false}
          onClick={() => rememberLocale(l)}
          className={
            l === locale
              ? "bg-sfl-gold px-2 py-1 text-sfl-black"
              : "px-2 py-1 text-white hover:text-sfl-gold"
          }
        >
          {LABELS[l]}
        </NextLink>
      ))}
    </div>
  );
}
