"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import LocaleSwitcher from "./LocaleSwitcher";

const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/evenimente", key: "events" },
  { href: "/despre-noi", key: "about" },
  { href: "/implica-te", key: "getInvolved" }
] as const;

export default function Navbar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const linkClass = (href: string) =>
    `font-display text-sm font-bold uppercase tracking-wide transition-colors ${
      pathname === href ? "text-sfl-gold" : "text-white hover:text-sfl-gold"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-sfl-black">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 md:shrink-0"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/images/sfl-romania-logo.png"
            alt={t("logoAlt")}
            width={44}
            height={44}
            priority
            className="w-11 shrink-0"
          />
          <span className="font-display text-sm font-bold uppercase leading-tight tracking-wide text-white sm:text-base md:text-lg md:leading-7 md:tracking-wider">
            {t("siteName")}
          </span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link key={item.key} href={item.href} className={linkClass(item.href)}>
              {t(item.key)}
            </Link>
          ))}
          <LocaleSwitcher />
        </div>

        <button
          type="button"
          aria-label={t("menu")}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          <span className="h-0.5 w-6 bg-sfl-gold" />
          <span className="h-0.5 w-6 bg-sfl-gold" />
          <span className="h-0.5 w-6 bg-sfl-gold" />
        </button>
      </nav>

      {open && (
        <div className="flex flex-col gap-4 border-t border-sfl-gray px-4 py-4 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={linkClass(item.href)}
              onClick={() => setOpen(false)}
            >
              {t(item.key)}
            </Link>
          ))}
          <LocaleSwitcher />
        </div>
      )}
    </header>
  );
}
