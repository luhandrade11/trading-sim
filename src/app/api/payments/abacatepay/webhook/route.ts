// AbacatePay webhook (API v1) — confirms PIX payment and credits user balance
//
// Setup in AbacatePay dashboard → Webhooks → Criar webhook:
//   Versão:  Webhook v1
//   URL:     https://primebroker.work/api/payments/abacatepay/webhook
//   Secret:  <ABACATEPAY_WEBHOOK_SECRET>   (AbacatePay appends ?webhookSecret=… )
//   Eventos: billing.paid
//
// Env vars:
//   ABACATEPAY_WEBHOOK_SECRET — must equal the Secret set in the dashboard form

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const AFFILIATE_RATE = 0.10;

export async function POST(req: NextRequest) {
  // AbacatePay sends the secret on the query string as ?webhookSecret=…
  // (also accept ?secret= for backwards compatibility)
  const qsSecret  = req.nextUrl.searchParams.get("webhookSecret")
                 ?? req.nextUrl.searchParams.get("secret");
  const envSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;
  if (envSecret) {
    if (qsSecret !== envSecret) {
      console.warn("[AbacatePay] Webhook rejected — bad webhookSecret");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (process.env.NODE_ENV === "production") {
    console.error("[AbacatePay] ABACATEPAY_WEBHOOK_SECRET not set in production");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const rawBody = await req.text();

  let event: Record<string, unknown>;
  try { event = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // v1 fires "billing.paid" when a PIX QR Code / billing is paid
  if (event.event !== "billing.paid") {
    return NextResponse.json({ ok: true });
  }

  // Payload shape varies: data.pixQrCode | data.billing | data
  const data   = (event.data as Record<string, unknown>) ?? {};
  const charge = (data.pixQrCode as Record<string, unknown>)
              ?? (data.billing  as Record<string, unknown>)
              ?? data;

  const status   = String(charge.status ?? "").toUpperCase();
  if (status && status !== "PAID") {
    return NextResponse.json({ ok: true });
  }

  const chargeId = String(charge.id ?? "");
  const metadata = (charge.metadata as Record<string, string>) ?? {};

  // userId: prefer metadata, fall back to externalId prefix ("<userId>_<ts>")
  const userId    = metadata.userId
                 || String(metadata.externalId ?? "").split("_")[0]
                 || "";
  // amountUsd: prefer metadata, fall back to recomputing from BRL amount (cents)
  const brlCents  = Number(charge.amount ?? 0);
  const brlRate   = Number(process.env.BRL_RATE ?? 5.20);
  const amountUsd = Number(metadata.amountUsd)
                 || (brlCents > 0 ? Math.round((brlCents / 100 / brlRate) * 100) / 100 : 0);

  if (!userId || !chargeId || !amountUsd || amountUsd <= 0) {
    console.warn("[AbacatePay] Webhook missing metadata", { userId, chargeId, amountUsd });
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  // Idempotency — skip if already processed
  const existing = await prisma.depositLog.findUnique({
    where: { externalId: chargeId },
  }).catch(() => null);
  if (existing) return NextResponse.json({ ok: true });

  // Fetch settings for first deposit bonus
  const settingRow = await prisma.adminSettings.findUnique({ where: { key: "firstDepositBonusPct" } }).catch(() => null);
  const firstDepositBonusPct = settingRow ? Number(settingRow.value) : 50;

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where:  { id: userId },
      select: { referredBy: true, firstDepositDone: true },
    });

    // Credit real balance + first deposit bonus if applicable
    const isFirst = user && !user.firstDepositDone;
    const bonus   = isFirst && firstDepositBonusPct > 0 ? Math.round(amountUsd * (firstDepositBonusPct / 100) * 100) / 100 : 0;
    const totalCredit = amountUsd + bonus;

    await tx.user.update({
      where: { id: userId },
      data: isFirst
        ? { realBalance: { increment: totalCredit }, firstDepositDone: true, totalDeposited: { increment: amountUsd } }
        : { realBalance: { increment: amountUsd }, totalDeposited: { increment: amountUsd } },
    });

    if (bonus > 0) {
      console.log(`[AbacatePay] First deposit bonus: $${bonus} for user ${userId}`);
    }

    // Idempotency log
    await tx.depositLog.create({
      data: {
        userId,
        externalId: chargeId,
        amount:     amountUsd,
        currency:   "brl",
        provider:   "abacatepay",
        status:     "completed",
      },
    });

    // Affiliate commission
    if (user?.referredBy) {
      const commission = Math.round(amountUsd * AFFILIATE_RATE * 100) / 100;
      await tx.user.update({
        where: { id: user.referredBy },
        data:  { realBalance: { increment: commission } },
      });
      await tx.affiliateEarning.create({
        data: {
          userId:        user.referredBy,
          referredId:    userId,
          depositAmount: amountUsd,
          commission,
        },
      });
    }
  });

  console.log(`[AbacatePay] Credited $${amountUsd} to user ${userId}`);
  return NextResponse.json({ ok: true });
}
