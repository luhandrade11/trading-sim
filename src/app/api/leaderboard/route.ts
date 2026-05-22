import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

function anonymize(name: string): string {
  if (!name || name.length === 0) return "Trader***";
  return name.slice(0, 3) + "***";
}

export async function GET(req: NextRequest) {
  // Rate-limit: 20 req/min per IP to prevent data scraping
  if (!rateLimit(`leaderboard:${getIp(req)}`, 20, 60_000))
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });

  try {
    // Use DB aggregation — don't load all trades into memory
    const [winGroups, totalGroups, pnlGroups] = await Promise.all([
      prisma.trade.groupBy({
        by: ["userId"],
        where: { result: "WIN" },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 200,
      }),
      prisma.trade.groupBy({
        by: ["userId"],
        where: { result: { in: ["WIN", "LOSS"] } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 200,
      }),
      prisma.trade.groupBy({
        by: ["userId"],
        where: { result: { in: ["WIN", "LOSS"] } },
        _sum: { profit: true },
        orderBy: { _sum: { profit: "desc" } },
        take: 50,
      }),
    ]);

    // Build lookup maps
    const winMap   = new Map(winGroups.map((g) => [g.userId, g._count.id]));
    const totalMap = new Map(totalGroups.map((g) => [g.userId, g._count.id]));
    const pnlMap   = new Map(pnlGroups.map((g) => [g.userId, g._sum.profit ?? 0]));

    // Only users with at least 1 trade, sort by PnL
    const userIds = [...new Set([...pnlMap.keys(), ...totalMap.keys()])].slice(0, 50);
    if (userIds.length === 0) return NextResponse.json([]);

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(users.map((u) => [u.id, u.name]));

    const rows = userIds
      .map((uid) => {
        const wins  = winMap.get(uid) ?? 0;
        const total = totalMap.get(uid) ?? 0;
        const pnl   = pnlMap.get(uid) ?? 0;
        return {
          id:           uid,
          display_name: anonymize(nameMap.get(uid) ?? ""),
          wins,
          total_trades: total,
          win_rate:     total > 0 ? Math.round((wins / total) * 100) : 0,
          pnl:          Math.round(pnl * 100) / 100,
        };
      })
      .filter((r) => r.total_trades >= 1)
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 20)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
