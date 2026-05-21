import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const amount  = Number(session.metadata?.amount);

    if (userId && amount > 0) {
      await prisma.user.update({
        where: { id: userId },
        data:  { balance: { increment: amount } },
      });
    }
  }

  return NextResponse.json({ received: true });
}
