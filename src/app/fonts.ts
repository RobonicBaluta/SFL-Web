import { Inter, Oswald } from "next/font/google";

export const oswald = Oswald({
  subsets: ["latin", "latin-ext"],
  variable: "--font-oswald",
  weight: ["500", "600", "700"],
});

export const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});
