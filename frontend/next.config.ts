import path from "node:path";

import type { NextConfig } from "next";

/**
 * Content-Security-Policy applied to every response.
 *
 * `'unsafe-inline'` for scripts is required because Next.js injects inline
 * bootstrap and hydration scripts, and this app does not use nonces yet.
 * `'unsafe-eval'` is added only in development, where Next.js uses it for
 * Fast Refresh. Remove the `'unsafe-inline'` exception once nonces are wired.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/**
 * Security headers applied to every route. Keep in step with the CSP above.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  // The player seed lives in `data/seeds/` at the repo root, outside this app,
  // and the mock reads it at runtime. Turbopack must be able to see that folder.
  turbopack: {
    root: path.join(import.meta.dirname, ".."),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
