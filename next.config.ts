import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/adapter-neon",
    "@neondatabase/serverless",
    "@prisma/client",
    "ws",
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
  ],
};

export default nextConfig;
