import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_token";
const TOKEN_TTL   = 7 * 24 * 60 * 60 * 1000; // 7 days

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function createAdminToken(): string {
  const secret = process.env.ADMIN_JWT_SECRET ?? "changeme-set-in-env";
  const payload = JSON.stringify({ iat: Date.now(), exp: Date.now() + TOKEN_TTL });
  const payloadB64 = b64url(Buffer.from(payload));
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest();
  return `${payloadB64}.${b64url(sig)}`;
}

export function verifyAdminTokenSync(token: string): boolean {
  try {
    const secret = process.env.ADMIN_JWT_SECRET ?? "changeme-set-in-env";
    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return false;

    const expected = b64url(
      crypto.createHmac("sha256", secret).update(payloadB64).digest()
    );
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigB64))) return false;

    const b64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(b64, "base64").toString());
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

export async function getAdminSession(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyAdminTokenSync(token);
}

export { COOKIE_NAME };
