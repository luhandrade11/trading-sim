import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedPrices } from "@/lib/priceCache";
import { PAYOUT_RATE } from "@/lib/constants";

const BATCH_SIZE = 200;

// Called by Vercel Cron every minute — settles ALL expired trades
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const prices = getCachedPrices();
  if (!prices) return NextResponse.json({ settled: 0, reason: "no price cache" });

  const now = new Date();
  let totalSettled = 0;
  let hasMore = true;

  while (hasMore) {
    const expired = await prisma.trade.findMany({
      where: { result: "PENDING", expiresAt: { lte: now } },
      take: BATCH_SIZE,
    });

    if (expired.length === 0) break;
    hasMore = expired.length === BATCH_SIZE;

    for (const trade of expired) {
      const exitPrice = prices[trade.asset]?.price;
      if (!exitPrice || exitPrice <= 0) continue;

      const won =
        (trade.direction === "UP"   && exitPrice >= trade.entryPrice) ||
        (trade.direction === "DOWN" && exitPrice <= trade.entryPrice);

      const profit = won ? trade.amount * PAYOUT_RATE : 0;
      const result = won ? "WIN" : "LOSS";

      const balanceField = trade.mode === "real" ? "realBalance" : "balance";
      await prisma.$transaction([
        prisma.trade.update({ where: { id: trade.id }, data: { exitPrice, result, profit } }),
        prisma.user.update({
          where: { id: trade.userId },
          data: { [balanceField]: { increment: won ? trade.amount + profit : 0 } },
        }),
      ]);
      totalSettled++;
    }
  }

  return NextResponse.json({ settled: totalSettled });
}
