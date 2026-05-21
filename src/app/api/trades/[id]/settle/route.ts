import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PAYOUT_RATE, MAX_EXIT_PRICE_MULTIPLIER } from "@/lib/constants";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const { exitPrice } = body;
  if (typeof exitPrice !== "number" || exitPrice <= 0) {
    return NextResponse.json({ error: "Preço de saída inválido" }, { status: 400 });
  }

  const trade = await prisma.trade.findUnique({ where: { id } });
  if (!trade || trade.userId !== session.user.id) {
    return NextResponse.json({ error: "Operação não encontrada" }, { status: 404 });
  }
  if (trade.result !== "PENDING") {
    // Already settled — return existing result (idempotent)
    return NextResponse.json(trade);
  }

  // Sanity cap: exit price can't be unrealistically high
  if (exitPrice > trade.entryPrice * MAX_EXIT_PRICE_MULTIPLIER) {
    return NextResponse.json({ error: "Preço de saída suspeito" }, { status: 400 });
  }

  const won =
    (trade.direction === "UP" && exitPrice > trade.entryPrice) ||
    (trade.direction === "DOWN" && exitPrice < trade.entryPrice);

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
