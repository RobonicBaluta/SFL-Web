import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { inter, oswald } from "@/app/fonts";
import { routing } from "@/i18n/routing";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { assertLocale } from "@/i18n/locale";
import { openGraphFor } from "@/lib/seo";
import { siteConfig } from "@/site.config";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = assertLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: t("defaultTitle"), template: `%s | ${siteConfig.name}` },
    description: t("defaultDescription"),
    // Fallback for pages without their own (e.g. 404); pages set the full set via pageMetadata.
    openGraph: openGraphFor(locale, null),
    twitter: { card: "summary_large_image" }
  } satisfies Metadata;
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} className={`${oswald.variable} ${inter.variable}`}>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider>
          <Navbar />
          {children}
          <Footer />
        </NextIntlClientProvider>
        {/* Cookieless visitor statistics; enable in Vercel → Project → Analytics. */}
        <Analytics />
      </body>
    </html>
  );
}
