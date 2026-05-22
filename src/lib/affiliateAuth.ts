import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const AFFILIATE_COOKIE = "affiliate_token";
const TOKEN_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const AFFILIATE_RATE = 0.90;

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function requireSecret(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`[Security] ${name} env var must be set`);
  return val;
}

export function createAffiliateToken(affiliateId: string): string {
  const secret = requireSecret("AFFILIATE_JWT_SECRET");
  const payload = JSON.stringify({ id: affiliateId, iat: Date.now(), exp: Date.now() + TOKEN_TTL });
  const payloadB64 = b64url(Buffer.from(payload));
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest();
  return `${payloadB64}.${b64url(sig)}`;
}

export function verifyAffiliateToken(token: string): string | null {
  try {
    const secret = process.env.AFFILIATE_JWT_SECRET;
    if (!secret) return null;
    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return null;

    const expected = b64url(crypto.createHmac("sha256", secret).update(payloadB64).digest());
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigB64))) return null;

    const b64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(b64, "base64").toString());
    if (payload.exp < Date.now()) return null;
    return payload.id as string;
  } catch {
    return null;
  }
}

export async function getAffiliateSession(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(AFFILIATE_COOKIE)?.value;
  if (!token) return null;
  return verifyAffiliateToken(token);
}

export { AFFILIATE_RATE };
