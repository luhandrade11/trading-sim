import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { exitPrice } = await req.json();

  const trade = await prisma.trade.findUnique({ where: { id } });
  if (!trade || trade.userId !== session.user.id || trade.result !== "PENDING") {
    return NextResponse.json({ error: "Operação inválida" }, { status: 400 });
  }

  const won =
    (trade.direction === "UP" && exitPrice > trade.entryPrice) ||
    (trade.direction === "DOWN" && exitPrice < trade.entryPrice);

  const profit = won ? trade.amount * 0.85 : 0;
  const result = won ? "WIN" : "LOSS";

  const [updated] = await prisma.$transaction([
    prisma.trade.update({
      where: { id },
      data: { exitPrice, result, profit },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { balance: { increment: won ? trade.amount + profit : 0 } },
    }),
  ]);

  return NextResponse.json(updated);
}
