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

  if (typeof amount !== "number" || amount < 10 || amount > 1_000_000)
    return NextResponse.json({ error: "Valor mínimo: $10" }, { status: 400 });
  if (!method || !details)
    return NextResponse.json({ error: "Método e detalhes são obrigatórios" }, { status: 400 });

  // Atomic: check realBalance and create withdrawal in one transaction
  let withdrawal;
  try {
    withdrawal = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: session.user.id }, select: { realBalance: true, isBlocked: true, emailVerified: true } });
      if (!user) throw Object.assign(new Error("not_found"), { code: 404 });
      if (user.isBlocked) throw Object.assign(new Error("blocked"), { code: 403 });
      if (!user.emailVerified) throw Object.assign(new Error("email_unverified"), { code: 403 });
      if (user.realBalance < amount) throw Object.assign(new Error("insufficient"), { code: 400 });

      // Block concurrent duplicates: no other PENDING withdrawal for this user
      const pending = await tx.withdrawal.count({ where: { userId: session.user.id, status: "PENDING" } });
      if (pending > 0) throw Object.assign(new Error("pending_exists"), { code: 400 });

      return tx.withdrawal.create({
        data: {
          userId:  session.user.id,
          amount,
          method:  String(method).slice(0, 50),
          details: String(details).slice(0, 200),
        },
      });
    });
  } catch (err: unknown) {
    const e = err as Error & { code?: number };
    if (e.message === "not_found")        return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    if (e.message === "blocked")          return NextResponse.json({ error: "Conta bloqueada" }, { status: 403 });
    if (e.message === "email_unverified") return NextResponse.json({ error: "Confirme seu email para solicitar saques" }, { status: 403 });
    if (e.message === "insufficient")     return NextResponse.json({ error: "Saldo real insuficiente" }, { status: 400 });
    if (e.message === "pending_exists")   return NextResponse.json({ error: "Você já tem um saque pendente" }, { status: 400 });
    throw err;
  }

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
