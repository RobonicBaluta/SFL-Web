import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  { ignores: [".next/**", "node_modules/**", "public/**", "scripts/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/**/*.tsx"],
    rules: {
      "react/jsx-no-literals": [
        "error",
        { allowedStrings: ["RO", "EN", "•", "–", "|", "©"] }
      ]
    }
  },
  {
    // The single-user admin page is English-only and outside the public RO/EN
    // translations; its thumbnails come from an authenticated API route.
    files: ["src/app/admin/**/*.tsx"],
    rules: { "react/jsx-no-literals": "off", "@next/next/no-img-element": "off" }
  }
];

export default config;
