import type { NextConfig } from "next";

/**
 * Frontend ↔ Backend wiring:
 * The Next.js SPA (repo root) proxies /api/v1/*, /api/schema/* and /api/docs
 * to the independent Django backend via beforeFiles rewrites — the browser
 * always stays same-origin, so auth cookies and CSRF semantics are simple.
 */
const DJANGO = process.env.DJANGO_INTERNAL_URL ?? "http://host.docker.internal:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/api/v1/:path*", destination: `${DJANGO}/api/v1/:path*` },
        { source: "/api/schema/:path*", destination: `${DJANGO}/api/schema/:path*` },
        { source: "/api/schema", destination: `${DJANGO}/api/schema` },
        { source: "/api/docs/:path*", destination: `${DJANGO}/api/docs/:path*` },
        { source: "/api/docs", destination: `${DJANGO}/api/docs` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
