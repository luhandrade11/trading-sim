import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last 7 days

  // Users with abnormally high win rate (>= 85% with at least 10 real trades)
  const recentRealTrades = await prisma.trade.groupBy({
    by: ["userId"],
    where: { mode: "real", result: { not: "PENDING" }, createdAt: { gte: since } },
    _count: { id: true },
    _sum: { profit: true },
    having: { id: { _count: { gte: 10 } } },
  });

  const winRateQuery = await prisma.trade.groupBy({
    by: ["userId", "result"],
    where: { mode: "real", result: { not: "PENDING" }, createdAt: { gte: since } },
    _count: { id: true },
  });

  // Build per-user win/loss counts
  const winMap: Record<string, { wins: number; total: number; profit: number }> = {};
  for (const r of recentRealTrades) {
    winMap[r.userId] = { wins: 0, total: r._count.id, profit: r._sum.profit ?? 0 };
  }
  for (const r of winRateQuery) {
    if (!winMap[r.userId]) continue;
    if (r.result === "WIN") winMap[r.userId].wins = r._count.id;
  }

  const suspiciousUserIds = Object.entries(winMap)
    .filter(([, v]) => v.total >= 10 && v.wins / v.total >= 0.85)
    .map(([id]) => id)
    .slice(0, 20);

  const suspiciousUsers = suspiciousUserIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: suspiciousUserIds } },
        select: { id: true, name: true, email: true, realBalance: true, isBlocked: true },
      })
    : [];

  const suspiciousWithStats = suspiciousUsers.map((u) => ({
    ...u,
    trades:  winMap[u.id]?.total ?? 0,
    wins:    winMap[u.id]?.wins ?? 0,
    winRate: winMap[u.id] ? Math.round((winMap[u.id].wins / winMap[u.id].total) * 100) : 0,
    profit:  winMap[u.id]?.profit ?? 0,
  }));

  // Multiple withdrawals in short period (>= 3 in 7 days)
  const bulkWithdrawals = await prisma.withdrawal.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: since } },
    _count: { id: true },
    having: { id: { _count: { gte: 3 } } },
  });

  const bulkUserIds = bulkWithdrawals.map((r) => r.userId).slice(0, 20);
  const bulkUsers = bulkUserIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: bulkUserIds } },
        select: { id: true, name: true, email: true, realBalance: true, isBlocked: true },
      })
    : [];

  const bulkWithMap = Object.fromEntries(bulkWithdrawals.map((r) => [r.userId, r._count.id]));
  const bulkWithStats = bulkUsers.map((u) => ({
    ...u,
    withdrawalCount: bulkWithMap[u.id] ?? 0,
  }));

  // Large single withdrawals (>= $500)
  const largeWithdrawals = await prisma.withdrawal.findMany({
    where: { createdAt: { gte: since }, amount: { gte: 500 } },
    orderBy: { amount: "desc" },
    take: 10,
    select: {
      id: true, amount: true, status: true, createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Accounts created and deposited within 1 hour (rapid deposit pattern)
  const rapidDepositors = await prisma.depositLog.findMany({
    where: { status: "completed", createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { userId: true, amount: true, createdAt: true },
  });

  const rapidUserIds = [...new Set(rapidDepositors.map((d) => d.userId))].slice(0, 20);
  const rapidUsers = rapidUserIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: rapidUserIds } },
        select: { id: true, name: true, email: true, createdAt: true },
      })
    : [];

  const depositMap: Record<string, { amount: number; depositedAt: Date }> = {};
  for (const d of rapidDepositors) {
    if (!depositMap[d.userId]) depositMap[d.userId] = { amount: d.amount, depositedAt: d.createdAt };
  }

  const rapidPatterns = rapidUsers
    .filter((u) => {
      const dep = depositMap[u.id];
      if (!dep) return false;
      const msSinceReg = dep.depositedAt.getTime() - u.createdAt.getTime();
      return msSinceReg < 3_600_000; // deposited within 1 hour of registering
    })
    .map((u) => ({ ...u, depositAmount: depositMap[u.id]?.amount ?? 0 }));

  return NextResponse.json({
    suspiciousWinRate: suspiciousWithStats,
    bulkWithdrawals:   bulkWithStats,
    largeWithdrawals,
    rapidDepositors:   rapidPatterns,
  });
}
