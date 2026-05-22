// AbacatePay webhook — confirms PIX payment and credits user balance
//
// Setup in AbacatePay dashboard → Webhooks:
//   URL: https://yourdomain.com/api/payments/abacatepay/webhook?secret=YOUR_SECRET
//   Events: transparent.completed
//
// Env vars:
//   ABACATEPAY_WEBHOOK_SECRET — the secret you set in the query string above

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const AFFILIATE_RATE = 0.10;

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.ABACATEPAY_WEBHOOK_SECRET;
  if (!secret) {
    // In development without secret configured, allow through
    return process.env.NODE_ENV !== "production";
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  // Query-string secret check
  const qsSecret  = req.nextUrl.searchParams.get("secret");
  const envSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;
  if (envSecret && qsSecret !== envSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rawBody   = await req.text();
  const signature = req.headers.get("x-webhook-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    console.warn("[AbacatePay] Invalid webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try { event = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Only process transparent PIX completions
  if (event.event !== "transparent.completed") {
    return NextResponse.json({ ok: true });
  }

  const charge    = (event.data as Record<string, unknown>) ?? {};
  const chargeId  = String(charge.id ?? "");
  const metadata  = (charge.metadata as Record<string, string>) ?? {};
  const userId    = metadata.userId;
  const amountUsd = Number(metadata.amountUsd);

  if (!userId || !chargeId || !amountUsd || amountUsd <= 0) {
    console.warn("[AbacatePay] Webhook missing metadata", { userId, chargeId, amountUsd });
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  // Idempotency — skip if already processed
  const existing = await prisma.depositLog.findUnique({
    where: { externalId: chargeId },
  }).catch(() => null);
  if (existing) return NextResponse.json({ ok: true });

  await prisma.$transaction(async (tx) => {
    // Credit real balance
    await tx.user.update({
      where: { id: userId },
      data:  { realBalance: { increment: amountUsd } },
    });

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
    const user = await tx.user.findUnique({
      where:  { id: userId },
      select: { referredBy: true },
    });
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
