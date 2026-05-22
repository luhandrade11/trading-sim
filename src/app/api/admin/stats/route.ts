import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const now       = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart  = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 6);

  const [
    totalUsers,
    newUsersToday,
    newUsersWeek,
    totalDepositLogs,
    depositLogsToday,
    depositLogsWeek,
    pendingWithdrawals,
    realTrades,
    affiliateCommissions,
    activeUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.depositLog.aggregate({ where: { status: "completed" }, _sum: { amount: true } }),
    prisma.depositLog.aggregate({ where: { status: "completed", createdAt: { gte: todayStart } }, _sum: { amount: true } }),
    prisma.depositLog.aggregate({ where: { status: "completed", createdAt: { gte: weekStart } }, _sum: { amount: true } }),
    prisma.withdrawal.findMany({
      where: { status: "PENDING" },
      select: { id: true, amount: true, userId: true, method: true, details: true, createdAt: true,
        user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.trade.findMany({
      where: { mode: "real", result: { not: "PENDING" } },
      select: { result: true, amount: true, profit: true },
    }),
    prisma.affiliateEarning.aggregate({ _sum: { commission: true } }),
    prisma.trade.count({
      where: { result: "PENDING", createdAt: { gte: new Date(Date.now() - 15 * 60_000) } },
    }),
  ]);

  const totalRevenue   = totalDepositLogs._sum.amount ?? 0;
  const revenueToday   = depositLogsToday._sum.amount ?? 0;
  const revenueWeek    = depositLogsWeek._sum.amount ?? 0;

  const platformPnl    = realTrades.reduce(
    (sum, t) => sum + (t.result === "LOSS" ? t.amount : -(t.profit ?? 0)),
    0
  );

  const wins      = realTrades.filter((t) => t.result === "WIN").length;
  const losses    = realTrades.filter((t) => t.result === "LOSS").length;
  const realWinRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

  const pendingWithdrawalsAmount = pendingWithdrawals.reduce((s, w) => s + w.amount, 0);

  return NextResponse.json({
    totalUsers,
    newUsersToday,
    newUsersWeek,
    totalRevenue,
    revenueToday,
    revenueWeek,
    platformPnl,
    realWinRate,
    realTradesCount: wins + losses,
    pendingWithdrawalsCount: pendingWithdrawals.length,
    pendingWithdrawalsAmount,
    recentPendingWithdrawals: pendingWithdrawals,
    affiliateCommissions: affiliateCommissions._sum.commission ?? 0,
    activeUsers,
  });
}
