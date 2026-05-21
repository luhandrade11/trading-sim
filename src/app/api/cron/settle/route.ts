import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedPrices } from "@/lib/priceCache";
import { PAYOUT_RATE } from "@/lib/constants";

// Called by Vercel Cron every minute — settles any trades the client missed
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const prices = getCachedPrices();
  if (!prices) return NextResponse.json({ settled: 0, reason: "no price cache" });

  const now = new Date();
  const expired = await prisma.trade.findMany({
    where: { result: "PENDING", expiresAt: { lte: now } },
    take: 50,
  });

  if (expired.length === 0) return NextResponse.json({ settled: 0 });

  let settled = 0;
  for (const trade of expired) {
    const exitPrice = prices[trade.asset]?.price;
    if (!exitPrice || exitPrice <= 0) continue;

    const won =
      (trade.direction === "UP"   && exitPrice > trade.entryPrice) ||
      (trade.direction === "DOWN" && exitPrice < trade.entryPrice);

    const profit = won ? trade.amount * PAYOUT_RATE : 0;
    const result = won ? "WIN" : "LOSS";

    await prisma.$transaction([
      prisma.trade.update({ where: { id: trade.id }, data: { exitPrice, result, profit } }),
      prisma.user.update({
        where: { id: trade.userId },
        data: { balance: { increment: won ? trade.amount + profit : 0 } },
      }),
    ]);
    settled++;
  }

  return NextResponse.json({ settled });
}
