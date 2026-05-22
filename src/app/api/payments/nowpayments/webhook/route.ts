// NOWPayments IPN (Instant Payment Notification) webhook
// Configure in: nowpayments.io → Settings → IPN Settings
//   IPN Callback URL: https://yourdomain.com/api/payments/nowpayments/webhook
//   Secret:          same value as NOWPAYMENTS_IPN_SECRET env var

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) return true; // skip in dev if not configured
  const hmac = crypto.createHmac("sha512", secret).update(body).digest("hex");
  return hmac === signature;
}

// USD amount credited per confirmed payment status
const FINALIZED_STATUSES = new Set(["finished", "confirmed", "sending", "partially_paid"]);

export async function POST(req: NextRequest) {
  const rawBody  = await req.text();
  const sig      = req.headers.get("x-nowpayments-sig") ?? "";

  if (!verifySignature(rawBody, sig)) {
    console.warn("[NOWPayments] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let data: Record<string, unknown>;
  try { data = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const status    = data.payment_status as string;
  const orderId   = data.order_id as string;       // format: "{userId}_{timestamp}"
  const priceUsd  = Number(data.price_amount);     // the USD amount we requested

  if (!FINALIZED_STATUSES.has(status)) {
    // Not yet settled — acknowledge without crediting
    return NextResponse.json({ ok: true });
  }

  // Extract userId from order_id
  const userId = orderId?.split("_")[0];
  if (!userId || !priceUsd || priceUsd <= 0) {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  // Idempotency: check if this payment was already processed
  const paymentId = String(data.payment_id);
  const existing  = await prisma.depositLog.findUnique({ where: { externalId: paymentId } }).catch(() => null);
  if (existing) return NextResponse.json({ ok: true });

  // Credit user's real balance + record deposit
  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data:  { realBalance: { increment: priceUsd } },
      }),
      prisma.depositLog.create({
        data: {
          userId,
          externalId: paymentId,
          amount:     priceUsd,
          currency:   String(data.pay_currency ?? "crypto"),
          provider:   "nowpayments",
          status:     status,
        },
      }),
    ]);
    console.log(`[NOWPayments] Credited $${priceUsd} to user ${userId}`);
  } catch (err) {
    console.error("[NOWPayments] DB error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
