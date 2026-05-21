import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ASSETS } from "@/lib/constants";

const VALID_DIRECTIONS = ["UP", "DOWN"];
const VALID_DURATIONS = [30, 60, 120, 300];
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 10000;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const trades = await prisma.trade.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(trades);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { asset, direction, amount, entryPrice, duration } = body;

  if (!ASSETS.includes(asset)) {
    return NextResponse.json({ error: "Ativo inválido" }, { status: 400 });
  }
  if (!VALID_DIRECTIONS.includes(direction)) {
    return NextResponse.json({ error: "Direção inválida" }, { status: 400 });
  }
  if (!VALID_DURATIONS.includes(duration)) {
    return NextResponse.json({ error: "Duração inválida" }, { status: 400 });
  }
  if (typeof amount !== "number" || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return NextResponse.json(
      { error: `Valor deve ser entre $${MIN_AMOUNT} e $${MAX_AMOUNT}` },
      { status: 400 }
    );
  }
  if (typeof entryPrice !== "number" || entryPrice <= 0) {
    return NextResponse.json({ error: "Preço de entrada inválido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.balance < amount) {
    return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + duration * 1000);

  const [trade] = await prisma.$transaction([
    prisma.trade.create({
      data: {
        userId: session.user.id,
        asset,
        direction,
        amount,
        entryPrice,
        duration,
        expiresAt,
      },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { balance: { decrement: amount } },
    }),
  ]);

  return NextResponse.json(trade);
}
