import { NextRequest, NextResponse } from "next/server";
import { getAffiliateSession } from "@/lib/affiliateAuth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/auditLog";

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

  if (!Number.isFinite(amount) || amount < 50)
    return NextResponse.json({ error: "Valor mínimo de saque: $50" }, { status: 400 });
  if (pixKey.length < 5 || pixKey.length > 200)
    return NextResponse.json({ error: "Chave PIX inválida" }, { status: 400 });

  const affiliate = await prisma.affiliate.findUnique({ where: { id: affiliateId } });
  if (!affiliate) return NextResponse.json({ error: "Afiliado não encontrado" }, { status: 404 });
  if (affiliate.status !== "ACTIVE")
    return NextResponse.json({ error: "Conta não autorizada para saques" }, { status: 403 });

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

  // Atomic balance check + deduct to prevent race conditions
  try {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.affiliate.findUnique({ where: { id: affiliateId }, select: { balance: true } });
      if (!fresh || fresh.balance < amount) throw new Error("insufficient");

      await tx.affiliate.update({
        where: { id: affiliateId },
        data: { balance: { decrement: amount }, lastWithdrawalAt: new Date() },
      });
      await tx.affiliateWithdrawal.create({
        data: { affiliateId, amount, pixKey: pixKey.slice(0, 200), status: "PENDING" },
      });
    });
  } catch (err: unknown) {
    if ((err as Error).message === "insufficient")
      return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    throw err;
  }

  writeAuditLog(affiliateId, "affiliate", "withdrawal_requested", affiliateId, { amount, pixKey: pixKey.slice(0, 30) + "…" });
  return NextResponse.json({ ok: true });
}
