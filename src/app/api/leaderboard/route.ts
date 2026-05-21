import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function anonymize(name: string): string {
  if (!name || name.length === 0) return "Trader***";
  const visible = name.slice(0, 3);
  return visible + "***";
}

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        trades: {
          where: { result: { in: ["WIN", "LOSS"] } },
          select: { result: true, profit: true },
        },
      },
    });

    const rows = users
      .map((u) => {
        const wins   = u.trades.filter((t) => t.result === "WIN").length;
        const total  = u.trades.length;
        const pnl    = u.trades.reduce((s, t) => s + (t.profit ?? 0), 0);
        return {
          id:           u.id,
          display_name: anonymize(u.name ?? ""),
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
