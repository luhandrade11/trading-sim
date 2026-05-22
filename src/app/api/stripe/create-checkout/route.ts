import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe não configurado. Adicione STRIPE_SECRET_KEY nas env vars." }, { status: 503 });
  }

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });

  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount);
  if (!amount || amount < 10 || amount > 50000)
    return NextResponse.json({ error: "Valor inválido (min $10, max $50.000)" }, { status: 400 });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(amount * 100),
          product_data: { name: "Depósito Prime Broker", description: `Depósito de $${amount.toFixed(2)}` },
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${baseUrl}/dashboard?deposit=success`,
    cancel_url:  `${baseUrl}/dashboard?deposit=cancelled`,
    metadata: { userId: session.user.id, amount: String(amount) },
    client_reference_id: session.user.id,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
