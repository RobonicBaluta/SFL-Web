import type { Metadata } from "next";
import Link from "next/link";
import { inter, oswald } from "@/app/fonts";
import { isLoggedIn } from "@/lib/admin/auth";
import LogoutButton from "./_components/LogoutButton";
import "../globals.css";

export const metadata: Metadata = {
  title: "SFL România · Admin",
  robots: { index: false, follow: false }
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = await isLoggedIn();
  return (
    <html lang="en" className={`${oswald.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-neutral-100">
        <header className="border-b-4 border-sfl-gold bg-sfl-black text-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/admin" className="font-display text-lg font-bold uppercase tracking-wide">
              SFL România <span className="text-sfl-gold">· Admin</span>
            </Link>
            {loggedIn && <LogoutButton />}
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
