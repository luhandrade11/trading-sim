import { NextRequest, NextResponse } from "next/server";
import { getAffiliateSession } from "@/lib/affiliateAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const affiliateId = await getAffiliateSession();
  if (!affiliateId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const take = 30;
  const skip = (page - 1) * take;

  const [total, totalAmountAgg, revenues] = await Promise.all([
    prisma.affiliateRevenue.count({ where: { affiliateId } }),
    prisma.affiliateRevenue.aggregate({ where: { affiliateId }, _sum: { amount: true } }),
    prisma.affiliateRevenue.findMany({
      where: { affiliateId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        userId: true,
        tradeId: true,
        amount: true,
        createdAt: true,
      },
    }),
  ]);

  // Enrich with user names
  const userIds = [...new Set(revenues.map((r) => r.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  const rows = revenues.map((r) => ({ ...r, playerName: userMap[r.userId] ?? "—" }));

  return NextResponse.json({ total, page, rows, totalAmount: totalAmountAgg._sum.amount ?? 0 });
}
