import type { NextConfig } from "next";

// Capacitor uygulamayı statik dosyalardan çalıştırır: sunucu yok.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
