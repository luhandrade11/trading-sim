import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch cashback settings
  const settingsRows = await prisma.adminSettings.findMany({
    where: { key: { in: ["cashbackPct", "cashbackMinLossUsd"] } },
  });
  const settingsMap: Record<string, string> = {};
  for (const r of settingsRows) settingsMap[r.key] = r.value;
  const cashbackPct        = Number(settingsMap.cashbackPct        ?? "5");
  const cashbackMinLossUsd = Number(settingsMap.cashbackMinLossUsd ?? "40");

  // Yesterday date range (UTC)
  const now       = new Date();
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yyyymmdd      = yesterday.toISOString().slice(0, 10);
  const dayStart      = new Date(yyyymmdd + "T00:00:00.000Z");
  const dayEnd        = new Date(yyyymmdd + "T23:59:59.999Z");

  // Aggregate losses per user for yesterday (real mode only)
  const lossGroups = await prisma.trade.groupBy({
    by:     ["userId"],
    where:  {
      mode:      "real",
      result:    "LOSS",
      createdAt: { gte: dayStart, lte: dayEnd },
    },
    _sum: { amount: true },
  });

  let applied = 0;
  for (const group of lossGroups) {
    const totalLoss = group._sum.amount ?? 0;
    if (totalLoss < cashbackMinLossUsd) continue;

    const cashback = Math.round(totalLoss * (cashbackPct / 100) * 100) / 100;
    await prisma.user.update({
      where: { id: group.userId },
      data:  { realBalance: { increment: cashback } },
    });
    console.log(`[Cashback] Applied $${cashback} to user ${group.userId} (loss: $${totalLoss})`);
    applied++;
  }

  return NextResponse.json({ applied });
}
