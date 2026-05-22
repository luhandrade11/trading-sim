import { NextResponse } from "next/server";
import { getAffiliateSession } from "@/lib/affiliateAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const affiliateId = await getAffiliateSession();
  if (!affiliateId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [affiliate, players, links, revenues, todayRevenue, monthRevenue, pendingWithdrawals] =
    await Promise.all([
      prisma.affiliate.findUnique({
        where: { id: affiliateId },
        select: { balance: true, totalEarned: true },
      }),
      prisma.user.count({ where: { affiliateId } }),
      prisma.affiliateLink.findMany({
        where: { affiliateId },
        select: { id: true, slug: true, title: true, clicks: true, conversions: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.affiliateRevenue.aggregate({
        where: { affiliateId },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.affiliateRevenue.aggregate({
        where: { affiliateId, createdAt: { gte: startOfDay } },
        _sum: { amount: true },
      }),
      prisma.affiliateRevenue.aggregate({
        where: { affiliateId, createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.affiliateWithdrawal.aggregate({
        where: { affiliateId, status: "PENDING" },
        _sum: { amount: true },
      }),
    ]);

  const totalClicks = links.reduce((s, l) => s + l.clicks, 0);
  const totalConversions = links.reduce((s, l) => s + l.conversions, 0);

  return NextResponse.json({
    balance: affiliate?.balance ?? 0,
    totalEarned: affiliate?.totalEarned ?? 0,
    activePlayers: players,
    totalClicks,
    totalConversions,
    totalRevenue: revenues._sum.amount ?? 0,
    totalTrades: revenues._count.id,
    todayRevenue: todayRevenue._sum.amount ?? 0,
    monthRevenue: monthRevenue._sum.amount ?? 0,
    pendingWithdrawals: pendingWithdrawals._sum.amount ?? 0,
    links,
  });
}
