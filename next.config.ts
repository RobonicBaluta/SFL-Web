import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { siteConfig } from "./src/site.config";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    // www serves the same site; one address keeps search engines from indexing
    // every page twice.
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: `www.${new URL(siteConfig.url).host}` }],
        destination: `${siteConfig.url}/:path*`,
        permanent: true
      }
    ];
  }
};

export default withNextIntl(nextConfig);
