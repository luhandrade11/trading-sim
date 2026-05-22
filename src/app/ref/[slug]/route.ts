import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const link = await prisma.affiliateLink.findUnique({ where: { slug } }).catch(() => null);
  if (!link) return NextResponse.redirect(new URL("/register", baseUrl));

  // Async click count — don't block redirect
  prisma.affiliateLink.update({
    where: { id: link.id },
    data: { clicks: { increment: 1 } },
  }).catch(() => {});

  // Store slug in cookie so registration can link the user to this affiliate
  const res = NextResponse.redirect(new URL(`/register?aff=${slug}`, baseUrl));
  res.cookies.set("aff_ref", slug, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });
  return res;
}
