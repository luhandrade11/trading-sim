import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const AFFILIATE_RATE = 0.10;

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe não configurado" }, { status: 503 });
  }

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });

  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";

  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as import("stripe").Stripe.Checkout.Session;
    const userId  = session.metadata?.userId;

    // Always read amountUsd — works for both USD charges and BRL charges
    // (BRL charges store amountUsd separately so we credit the correct USD value)
    const amount = Number(session.metadata?.amountUsd ?? session.metadata?.amount);

    if (!userId || !amount || amount <= 0) return NextResponse.json({ received: true });

    // Idempotency: skip if already processed
    const already = await prisma.depositLog.findUnique({ where: { externalId: event.id } }).catch(() => null);
    if (already) return NextResponse.json({ received: true });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { realBalance: { increment: amount } } });

      await tx.depositLog.create({
        data: { userId, externalId: event.id, amount, currency: "usd", provider: "stripe", status: "completed" },
      });

      const user = await tx.user.findUnique({ where: { id: userId }, select: { referredBy: true } });
      if (user?.referredBy) {
        const commission = Math.round(amount * AFFILIATE_RATE * 100) / 100;
        await tx.user.update({ where: { id: user.referredBy }, data: { realBalance: { increment: commission } } });
        await tx.affiliateEarning.create({
          data: { userId: user.referredBy, referredId: userId, depositAmount: amount, commission },
        });
      }
    });
  }

  return NextResponse.json({ received: true });
}
