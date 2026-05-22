/**
 * Wraps the fileURLToPath(import.meta.url) call in the generated Prisma client
 * so it doesn't throw when import.meta.url is empty (Next.js/webpack SSR bundles).
 */
import { readFileSync, writeFileSync, existsSync } from "fs";

const FILE = "src/generated/prisma/client.ts";

if (!existsSync(FILE)) {
  console.error(`patch-prisma: ${FILE} not found, skipping.`);
  process.exit(0);
}

let content = readFileSync(FILE, "utf8");

const BEFORE = `globalThis['__dirname'] = path.dirname(fileURLToPath(import.meta.url))`;
const AFTER  = `try { globalThis['__dirname'] ||= path.dirname(fileURLToPath(import.meta.url)) } catch {}`;

if (content.includes(AFTER)) {
  console.log("patch-prisma: already patched, skipping.");
  process.exit(0);
}

if (!content.includes(BEFORE)) {
  console.warn("patch-prisma: target line not found, Prisma may have changed its output — check manually.");
  process.exit(0);
}

content = content.replace(BEFORE, AFTER);
writeFileSync(FILE, content, "utf8");
console.log("patch-prisma: patched src/generated/prisma/client.ts for Vercel SSR compatibility.");
