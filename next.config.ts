import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Разрешённые внешние домены для next/image.
  // Внешние источники постеров; QR-коды билетов создаются локально.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
};

export default nextConfig;
