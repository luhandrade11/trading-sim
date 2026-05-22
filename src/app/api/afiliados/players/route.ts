import { NextRequest, NextResponse } from "next/server";
import { getAffiliateSession } from "@/lib/affiliateAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const affiliateId = await getAffiliateSession();
  if (!affiliateId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const take = 20;
  const skip = (page - 1) * take;

  const [total, users] = await Promise.all([
    prisma.user.count({ where: { affiliateId } }),
    prisma.user.findMany({
      where: { affiliateId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        name: true,
        email: true,
        affiliateLinkSlug: true,
        createdAt: true,
      },
    }),
  ]);

  // Fetch revenue per user
  const userIds = users.map((u) => u.id);
  const revenues = await prisma.affiliateRevenue.groupBy({
    by: ["userId"],
    where: { affiliateId, userId: { in: userIds } },
    _sum: { amount: true },
    _count: { id: true },
  });

  const revenueMap = Object.fromEntries(
    revenues.map((r) => [r.userId, { total: r._sum.amount ?? 0, trades: r._count.id }])
  );

  const rows = users.map((u) => ({
    ...u,
    earned: revenueMap[u.id]?.total ?? 0,
    trades: revenueMap[u.id]?.trades ?? 0,
  }));

  return NextResponse.json({ total, page, rows });
}
