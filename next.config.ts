import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera un build autocontenido para la imagen Docker del servidor interno.
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
