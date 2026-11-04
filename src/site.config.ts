export const siteConfig = {
  name: "Students for Liberty România",
  /** Short names people search for; Google may show one as the site name. */
  alternateNames: ["SFL România", "SFL Romania"],
  // Production domain: canonical URLs, hreflang, sitemap and share previews are
  // built from it. www and the old *.vercel.app address redirect here.
  url: "https://studentsforliberty.ro",
  // Shown in the footer, on "Implică-te" and in the privacy policy (content/pages);
  // empty = hidden. A test checks the privacy policy names this same address.
  contactEmail: "inbox@studentsforliberty.org" as string,
  logo: "/images/sfl-romania-logo.png",
  // Where the /admin page commits event changes (Vercel deploys from this branch).
  repository: { owner: "RobonicBaluta", name: "SFL-Web", branch: "main" },
  signupFormUrl: "https://studentsforliberty.org/europe/application/",
  parentOrganization: { name: "Students For Liberty", url: "https://studentsforliberty.org/" },
  // TODO(SFL): add your real profiles; entries with an empty url are hidden
  social: [
    { name: "Instagram", url: "https://www.instagram.com/esflromania/" },
    { name: "Facebook", url: "https://www.facebook.com/sflromania/" },
    { name: "TikTok", url: "" },
    { name: "LinkedIn", url: "" }
  ]
} as const;
