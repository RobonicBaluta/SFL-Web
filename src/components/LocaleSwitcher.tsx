"use client";

import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABELS: Record<string, string> = { ro: "RO", en: "EN" };

export default function LocaleSwitcher() {
  const pathname = usePathname();
  const params = useParams();
  const locale = useLocale();

  return (
    <div className="flex items-center gap-1 font-display text-sm font-bold">
      {routing.locales.map((l) => (
        <Link
          key={l}
          // @ts-expect-error -- pathname+params are valid for the current route (next-intl docs pattern)
          href={{ pathname, params }}
          locale={l}
          className={
            l === locale
              ? "bg-sfl-gold px-2 py-1 text-sfl-black"
              : "px-2 py-1 text-white hover:text-sfl-gold"
          }
        >
          {LABELS[l]}
        </Link>
      ))}
    </div>
  );
}
