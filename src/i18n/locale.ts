import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import type { Locale } from "@/lib/events";

/** Validates a route param as a supported locale; 404s otherwise. */
export function assertLocale(locale: string): Locale {
  if (!hasLocale(routing.locales, locale)) notFound();
  return locale;
}
