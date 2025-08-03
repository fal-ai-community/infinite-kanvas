/** @type {import('next').NextConfig} */
import { withBotId } from "botid/next/config";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  devIndicators: false,
  webpack: (config) => {
    // Ignore canvas module which is required by Konva in Node environments
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    return config;
  },
  images: {
    domains: ["fal.ai", "storage.googleapis.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fal.media",
      },
      {
        protocol: "https",
        hostname: "v3.fal.media",
      },
    ],
  },
};

export default withBotId(withSerwist(nextConfig));
