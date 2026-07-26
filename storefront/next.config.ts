import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // Local dev serves product photography straight off the API's /uploads mount.
    // Production will point at a CDN host instead — add it here, don't switch to
    // unoptimized globally.
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000", pathname: "/uploads/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000", pathname: "/uploads/**" },
    ],
  },
};

export default withNextIntl(nextConfig);
