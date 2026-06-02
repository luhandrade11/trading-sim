import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const BRL_RATE = () => Number(process.env.BRL_RATE ?? 5.20);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe não configurado." }, { status: 503 });
  }

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });

  const body  = await req.json().catch(() => null);
  const isBR  = body?.currency === "brl";
  const raw   = Number(body?.amount);

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  let unitAmount: number;   // what Stripe charges (in smallest currency unit)
  let currency: string;     // "brl" or "usd"
  let amountUsd: number;    // what gets credited to the user's account
  let displayLabel: string;

  if (isBR) {
    // amount is already in BRL (e.g. 100 = R$100)
    const amountBrl = raw;
    if (!amountBrl || amountBrl < 20 || amountBrl > 250_000)
      return NextResponse.json({ error: "Valor inválido (min R$20)" }, { status: 400 });

    currency     = "brl";
    unitAmount   = Math.round(amountBrl * 100);                         // R$100 → 10000 cents
    amountUsd    = Math.round((amountBrl / BRL_RATE()) * 100) / 100;   // credit USD equivalent
    displayLabel = `Depósito Prime Broker — R$${amountBrl.toFixed(2)} (≈ $${amountUsd})`;
  } else {
    // amount is in USD
    const amountUsdInput = raw;
    if (!amountUsdInput || amountUsdInput < 10 || amountUsdInput > 50_000)
      return NextResponse.json({ error: "Valor inválido (min $10, max $50.000)" }, { status: 400 });

    currency     = "usd";
    unitAmount   = Math.round(amountUsdInput * 100);
    amountUsd    = amountUsdInput;
    displayLabel = `Depósito Prime Broker — $${amountUsd.toFixed(2)}`;
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency,
        unit_amount: unitAmount,
        product_data: { name: "Depósito Prime Broker", description: displayLabel },
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: `${baseUrl}/dashboard?deposit=success`,
    cancel_url:  `${baseUrl}/dashboard/deposit`,
    // amountUsd always = the USD value to credit, regardless of charge currency
    metadata: { userId: session.user.id, amountUsd: String(amountUsd) },
    client_reference_id: session.user.id,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
