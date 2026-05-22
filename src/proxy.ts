import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function b64urlToBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64     = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded  = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const decoded = atob(padded);
  const bytes   = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
  return bytes;
}

async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const secret = process.env.ADMIN_JWT_SECRET ?? "changeme-set-in-env";
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [payloadB64, sigB64] = parts;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "HMAC", key,
      b64urlToBytes(sigB64),
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return false;
    const b64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)));
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Admin routes ──────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    // Always allow the login endpoints through
    if (pathname === "/admin/login" || pathname.startsWith("/api/admin/login")) {
      return NextResponse.next();
    }
    const adminToken = req.cookies.get("admin_token")?.value ?? "";
    if (!adminToken || !(await verifyAdminToken(adminToken))) {
      if (pathname.startsWith("/api/admin/")) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return NextResponse.next();
  }

  // ── Affiliate dashboard routes ────────────────────────────────────────────
  if (pathname.startsWith("/afiliados/dashboard") || pathname.startsWith("/api/afiliados/me") || pathname.startsWith("/api/afiliados/stats") || pathname.startsWith("/api/afiliados/links") || pathname.startsWith("/api/afiliados/players") || pathname.startsWith("/api/afiliados/revenues") || pathname.startsWith("/api/afiliados/withdraw") || pathname.startsWith("/api/afiliados/network") || pathname.startsWith("/api/afiliados/subafiliados") || pathname.startsWith("/api/afiliados/pending")) {
    const affiliateToken = req.cookies.get("affiliate_token")?.value ?? "";
    if (!affiliateToken || !(await verifyAffiliateToken(affiliateToken))) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/afiliados/login", req.url));
    }
    return NextResponse.next();
  }

  // ── User dashboard routes ─────────────────────────────────────────────────
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = new URL("/login", req.url);
    // Only allow internal paths to prevent open-redirect attacks
    const from = req.nextUrl.pathname;
    if (from.startsWith("/") && !from.startsWith("//")) {
      url.searchParams.set("from", from);
    }
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

async function verifyAffiliateToken(token: string): Promise<boolean> {
  try {
    const secret = process.env.AFFILIATE_JWT_SECRET ?? "affiliate-changeme";
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [payloadB64, sigB64] = parts;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "HMAC", key,
      b64urlToBytes(sigB64),
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return false;
    const b64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)));
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*", "/api/admin/:path*",
    "/afiliados/dashboard/:path*",
    "/api/afiliados/me",
    "/api/afiliados/stats",
    "/api/afiliados/links/:path*",
    "/api/afiliados/players",
    "/api/afiliados/revenues",
    "/api/afiliados/withdraw/:path*",
    "/api/afiliados/network",
    "/api/afiliados/subafiliados/:path*",
    "/api/afiliados/pending",
  ],
};
