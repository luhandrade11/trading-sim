import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const BRL_RATE = () => Number(process.env.BRL_RATE ?? 5.20);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe não configurado. Adicione STRIPE_SECRET_KEY nas env vars." }, { status: 503 });
  }

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });

  const body       = await req.json().catch(() => null);
  const amountUsd  = Number(body?.amount);
  const isBR       = body?.currency === "brl";

  if (!amountUsd || amountUsd < 10 || amountUsd > 50000)
    return NextResponse.json({ error: "Valor inválido (min $10, max $50.000)" }, { status: 400 });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  // For Brazilian users: charge in BRL, credit the USD equivalent
  const currency    = isBR ? "brl" : "usd";
  const unitAmount  = isBR
    ? Math.round(amountUsd * BRL_RATE() * 100)   // BRL cents
    : Math.round(amountUsd * 100);                // USD cents

  const displayLabel = isBR
    ? `Depósito Prime Broker — R$${(amountUsd * BRL_RATE()).toFixed(2)} (≈ $${amountUsd})`
    : `Depósito Prime Broker — $${amountUsd.toFixed(2)}`;

  const checkoutSession = await stripe.checkout.sessions.create({
    // "card" automatically includes Apple Pay and Google Pay in hosted checkout
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: unitAmount,
          product_data: { name: "Depósito Prime Broker", description: displayLabel },
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${baseUrl}/dashboard?deposit=success`,
    cancel_url:  `${baseUrl}/dashboard/deposit`,
    // Always store amountUsd so webhook knows the USD credit regardless of charge currency
    metadata: { userId: session.user.id, amountUsd: String(amountUsd) },
    client_reference_id: session.user.id,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
