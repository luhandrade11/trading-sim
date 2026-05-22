import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { PAYOUT_RATE, MAX_EXIT_PRICE_MULTIPLIER } from "@/lib/constants";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!rateLimit(`settle:${session.user.id}`, 30, 60_000))
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const { exitPrice, won: wonOverride } = body;
  if (typeof exitPrice !== "number" || exitPrice <= 0)
    return NextResponse.json({ error: "Preço de saída inválido" }, { status: 400 });

  const trade = await prisma.trade.findUnique({ where: { id } });
  if (!trade || trade.userId !== session.user.id)
    return NextResponse.json({ error: "Operação não encontrada" }, { status: 404 });

  // Idempotent — already settled
  if (trade.result !== "PENDING") return NextResponse.json(trade);

  // Sanity cap
  if (exitPrice > trade.entryPrice * MAX_EXIT_PRICE_MULTIPLIER)
    return NextResponse.json({ error: "Preço de saída suspeito" }, { status: 400 });

  // Use the sim-chart verdict when available (client compared sim entry vs sim exit price).
  // Fall back to real-price comparison only when the client didn't supply a verdict.
  const won = typeof wonOverride === "boolean"
    ? wonOverride
    : (trade.direction === "UP"   && exitPrice >= trade.entryPrice) ||
      (trade.direction === "DOWN" && exitPrice <= trade.entryPrice);

  const profit = won ? trade.amount * PAYOUT_RATE : 0;
  const result = won ? "WIN" : "LOSS";

  const [updated] = await prisma.$transaction([
    prisma.trade.update({ where: { id }, data: { exitPrice, result, profit } }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { balance: { increment: won ? trade.amount + profit : 0 } },
    }),
  ]);

  return NextResponse.json(updated);
}
