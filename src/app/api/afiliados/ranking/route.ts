import { NextResponse } from "next/server";
import { getAffiliateSession } from "@/lib/affiliateAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const affiliateId = await getAffiliateSession();
  if (!affiliateId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  // Top affiliates by total earned (last 30 days and all-time)
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [allTime, last30] = await Promise.all([
    // All-time: sort by totalEarned
    prisma.affiliate.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, level: true, totalEarned: true, balance: true },
      orderBy: { totalEarned: "desc" },
      take: 20,
    }),
    // Last 30 days: sum revenues
    prisma.affiliateRevenue.groupBy({
      by: ["affiliateId"],
      where: { createdAt: { gte: since30 } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 20,
    }),
  ]);

  const last30Ids = last30.map((r) => r.affiliateId);
  const last30Details = last30Ids.length > 0
    ? await prisma.affiliate.findMany({
        where: { id: { in: last30Ids } },
        select: { id: true, name: true, level: true, totalEarned: true },
      })
    : [];

  const detailMap = Object.fromEntries(last30Details.map((a) => [a.id, a]));
  const last30Ranked = last30.map((r) => ({
    ...detailMap[r.affiliateId],
    earned30: r._sum.amount ?? 0,
  })).filter((r) => r.id);

  // Find current user's rank
  const myAllTimeRank = allTime.findIndex((a) => a.id === affiliateId) + 1;
  const myLast30Rank  = last30Ranked.findIndex((a) => a.id === affiliateId) + 1;

  return NextResponse.json({
    allTime:      allTime.map((a, i) => ({ rank: i + 1, ...a, isMe: a.id === affiliateId })),
    last30:       last30Ranked.map((a, i) => ({ rank: i + 1, ...a, isMe: a.id === affiliateId })),
    myAllTimeRank: myAllTimeRank || null,
    myLast30Rank:  myLast30Rank  || null,
  });
}
