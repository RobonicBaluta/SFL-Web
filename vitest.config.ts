import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // next-intl imports "next/navigation" without an extension, which Node's ESM
    // resolver rejects; letting Vite process it resolves the import.
    server: { deps: { inline: ["next-intl"] } }
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
});
