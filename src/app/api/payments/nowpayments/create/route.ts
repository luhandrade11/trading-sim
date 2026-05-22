// NOWPayments crypto payment creation
// Setup: https://nowpayments.io → Create account → API → Get API Key
// Required env vars:
//   NOWPAYMENTS_API_KEY   — from nowpayments.io dashboard
//   NOWPAYMENTS_IPN_SECRET — from Settings → IPN Settings (for webhook verification)
//   NEXTAUTH_URL           — your app's public URL (for success/cancel redirect)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

// Map our currency IDs to NOWPayments currency codes
const CURRENCY_MAP: Record<string, string> = {
  BTC:       "btc",
  ETH:       "eth",
  USDTTRC20: "usdttrc20",
  BNB:       "bnbmainnet",
  SOL:       "sol",
  XRP:       "xrp",
  LTC:       "ltc",
  ADA:       "ada",
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  if (!rateLimit(`nowpay-create:${session.user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  }

  if (!process.env.NOWPAYMENTS_API_KEY) {
    return NextResponse.json({ error: "Pagamento com cripto temporariamente indisponível" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const { amount, currency } = body;

  if (typeof amount !== "number" || amount < 10 || amount > 100_000) {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }

  const payCurrency = CURRENCY_MAP[currency];
  if (!payCurrency) {
    return NextResponse.json({ error: "Criptomoeda não suportada" }, { status: 400 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const payload = {
    price_amount:    amount,
    price_currency:  "usd",
    pay_currency:    payCurrency,
    order_id:        `${session.user.id}_${Date.now()}`,
    order_description: `Prime Broker deposit — $${amount}`,
    ipn_callback_url:  `${baseUrl}/api/payments/nowpayments/webhook`,
    success_url:       `${baseUrl}/dashboard?deposit=success`,
    cancel_url:        `${baseUrl}/dashboard/deposit`,
    is_fixed_rate:     true,
    is_fee_paid_by_user: false,
  };

  const ac  = new AbortController();
  const tid = setTimeout(() => ac.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch(`${NOWPAYMENTS_API}/payment`, {
      method: "POST",
      headers: { "x-api-key": process.env.NOWPAYMENTS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ac.signal,
    });
  } catch {
    clearTimeout(tid);
    return NextResponse.json({ error: "Pagamento cripto indisponível (timeout)" }, { status: 502 });
  }
  clearTimeout(tid);

  const data = await res.json();

  if (!res.ok) {
    console.error("[NOWPayments] Create error:", data);
    return NextResponse.json({ error: "Erro ao criar pagamento cripto" }, { status: 502 });
  }

  return NextResponse.json({
    paymentId:   data.payment_id,
    payAddress:  data.pay_address,
    payCurrency: (data.pay_currency as string).toUpperCase(),
    payAmount:   data.pay_amount,
    status:      data.payment_status,
  });
}
