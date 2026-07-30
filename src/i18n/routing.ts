import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ro", "en"],
  defaultLocale: "ro",
  localePrefix: "as-needed",
  pathnames: {
    "/": "/",
    "/evenimente": { ro: "/evenimente", en: "/events" },
    "/evenimente/[slug]": { ro: "/evenimente/[slug]", en: "/events/[slug]" },
    "/despre-noi": { ro: "/despre-noi", en: "/about" },
    "/implica-te": { ro: "/implica-te", en: "/get-involved" }
  }
});
