import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export async function GET(req: NextRequest) {
  // Rate-limit verification attempts per IP to prevent token brute-force
  if (!rateLimit(`verify-email:${getIp(req)}`, 10, 3_600_000))
    return NextResponse.redirect(new URL("/login?error=too_many_attempts", req.url));

  const token = req.nextUrl.searchParams.get("token");
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    return NextResponse.redirect(new URL("/login?error=token_missing", req.url));

  const user = await prisma.user.findUnique({ where: { verifyToken: token } }).catch(() => null);
  if (!user) return NextResponse.redirect(new URL("/login?error=token_invalid", req.url));

  await prisma.user.update({
    where: { id: user.id },
    data:  { emailVerified: true, verifyToken: null },
  });

  return NextResponse.redirect(new URL("/dashboard?verified=1", req.url));
}
