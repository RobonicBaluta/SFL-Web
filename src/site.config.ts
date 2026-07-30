export const siteConfig = {
  name: "Students for Liberty România",
  // TODO(SFL): set the real production domain before launch
  url: "https://sfl-romania.vercel.app",
  // TODO(SFL): completați emailul de contact / set the contact email (empty = hidden)
  contactEmail: "",
  // TODO(SFL): înlocuiți cu formularul vostru de înscriere / replace with your signup form URL
  signupFormUrl: "https://studentsforliberty.org/",
  // TODO(SFL): add your real profiles; entries with an empty url are hidden
  social: [
    { name: "Instagram", url: "" },
    { name: "Facebook", url: "" },
    { name: "TikTok", url: "" },
    { name: "LinkedIn", url: "" }
  ]
} as const;
