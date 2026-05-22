import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "X-XSS-Protection",          value: "1; mode=block" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
  // HSTS — enforce HTTPS for 2 years (only active on HTTPS)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // CSP — inline scripts needed for theme-flash prevention and Next.js hydration
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' required for Next.js hydration chunks + theme-flash script
      "script-src 'self' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      // data: for base64 profile images; https: for external CDN images
      "img-src 'self' data: https:",
      // wss: for WebSocket price feeds; https: for payment APIs
      "connect-src 'self' wss: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "frame-src https://js.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  compress: true,
  serverExternalPackages: [
    "@prisma/adapter-neon",
    "@neondatabase/serverless",
    "@prisma/client",
    "ws",
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
  ],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
