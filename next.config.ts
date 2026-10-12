import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // keep any existing remote patterns you already have here
  },
  // Next.js 15+ blocks cross-origin requests to the dev server's internal
  // assets by default. Without this, opening the app at
  // http://192.168.21.1:3000 will still render, but you'll see a console
  // warning (or a hard block on newer versions) for HMR/asset requests
  // that originate from that LAN address instead of localhost.
  allowedDevOrigins: ["192.168.21.1", "localhost", "127.0.0.1"],
  // Pin Turbopack's root to this config file's directory. process.cwd() is
  // unreliable on Windows (drive-letter/case mismatches, or a stray lockfile
  // in a parent folder), which makes Turbopack fail to resolve `next` from
  // ./app. __dirname is always the real project root.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;