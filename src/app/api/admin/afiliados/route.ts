import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page    = Math.max(1, Number(searchParams.get("page") ?? 1));
  const q       = searchParams.get("q") ?? "";
  const pending = searchParams.get("pending") === "1";
  const take    = 20;
  const skip    = (page - 1) * take;

  const where = pending
    ? { status: "PENDING", parentAffiliateId: null as null }
    : q
    ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] }
    : {};

  const [total, affiliates] = await Promise.all([
    prisma.affiliate.count({ where }),
    prisma.affiliate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true, name: true, email: true,
        commissionRate: true, level: true, balance: true, totalEarned: true,
        status: true, parentAffiliateId: true, createdAt: true,
        _count: { select: { referredUsers: true, subAffiliates: true, revenues: true } },
      },
    }),
  ]);

  return NextResponse.json({ total, page, affiliates });
}
