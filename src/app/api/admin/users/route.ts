import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url    = req.nextUrl;
  const search = url.searchParams.get("q") ?? "";
  const page   = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const limit  = 20;
  const skip   = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { name:  { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, balance: true, realBalance: true,
        isBlocked: true, winRateOverride: true, adminNote: true,
        createdAt: true, referralCode: true, referredBy: true,
        _count: { select: { trades: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) });
}
