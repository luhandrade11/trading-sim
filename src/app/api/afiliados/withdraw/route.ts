import { NextRequest, NextResponse } from "next/server";
import { getAffiliateSession } from "@/lib/affiliateAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const affiliateId = await getAffiliateSession();
  if (!affiliateId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const withdrawals = await prisma.affiliateWithdrawal.findMany({
    where: { affiliateId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(withdrawals);
}

const WITHDRAWAL_COOLDOWN_DAYS = 7;

export async function POST(req: NextRequest) {
  const affiliateId = await getAffiliateSession();
  if (!affiliateId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount);
  const pixKey = String(body?.pixKey ?? "").trim();

  if (!amount || amount < 50)
    return NextResponse.json({ error: "Valor mínimo de saque: $50" }, { status: 400 });
  if (!pixKey)
    return NextResponse.json({ error: "Chave PIX obrigatória" }, { status: 400 });

  const affiliate = await prisma.affiliate.findUnique({ where: { id: affiliateId } });
  if (!affiliate) return NextResponse.json({ error: "Afiliado não encontrado" }, { status: 404 });

  // 7-day cooldown between withdrawals
  if (affiliate.lastWithdrawalAt) {
    const daysSince = (Date.now() - new Date(affiliate.lastWithdrawalAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < WITHDRAWAL_COOLDOWN_DAYS) {
      const nextDate = new Date(affiliate.lastWithdrawalAt);
      nextDate.setDate(nextDate.getDate() + WITHDRAWAL_COOLDOWN_DAYS);
      return NextResponse.json({
        error: `Saque disponível novamente em ${nextDate.toLocaleDateString("pt-BR")}`,
        nextWithdrawalAt: nextDate.toISOString(),
      }, { status: 429 });
    }
  }

  if (affiliate.balance < amount)
    return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });

  await prisma.$transaction([
    prisma.affiliate.update({
      where: { id: affiliateId },
      data: { balance: { decrement: amount }, lastWithdrawalAt: new Date() },
    }),
    prisma.affiliateWithdrawal.create({
      data: { affiliateId, amount, pixKey, status: "PENDING" },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
