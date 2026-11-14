import type { NextConfig } from "next";

/** Hosts de onde o site pode carregar imagens (Storage do Supabase e modo local). */
const imageHosts = [process.env.NEXT_PUBLIC_SUPABASE_URL, "http://localhost:8787"]
  .filter((value): value is string => Boolean(value))
  .map((value) => new URL(value));

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  transpilePackages: ["@pap/shared"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: imageHosts.map((url) => ({
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname: "/storage/v1/object/public/**",
    })),
    // No modo local as imagens vêm de localhost, que o otimizador recusa por segurança.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
