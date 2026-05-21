import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/login?error=token_missing", req.url));

  const user = await prisma.user.findUnique({ where: { verifyToken: token } }).catch(() => null);
  if (!user) return NextResponse.redirect(new URL("/login?error=token_invalid", req.url));

  await prisma.user.update({
    where: { id: user.id },
    data:  { emailVerified: true, verifyToken: null },
  });

  return NextResponse.redirect(new URL("/dashboard?verified=1", req.url));
}
