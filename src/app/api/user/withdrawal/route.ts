import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!rateLimit(`withdrawal:${session.user.id}`, 3, 3_600_000))
    return NextResponse.json({ error: "Muitas solicitações" }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const { amount, method, details } = body;

  if (typeof amount !== "number" || amount < 10)
    return NextResponse.json({ error: "Valor mínimo: $10" }, { status: 400 });
  if (!method || !details)
    return NextResponse.json({ error: "Método e detalhes são obrigatórios" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { balance: true } });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  if (user.balance < amount) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });

  const withdrawal = await prisma.withdrawal.create({
    data: {
      userId:  session.user.id,
      amount,
      method:  String(method).slice(0, 50),
      details: String(details).slice(0, 200),
    },
  });

  return NextResponse.json({ id: withdrawal.id, status: "PENDING", amount });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const withdrawals = await prisma.withdrawal.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, amount: true, method: true, status: true, createdAt: true },
  });

  return NextResponse.json(withdrawals);
}
