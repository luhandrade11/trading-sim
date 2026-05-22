// AbacatePay — Transparent PIX checkout
// Env vars required:
//   ABACATEPAY_API_KEY  — from AbacatePay dashboard → API Keys
//   BRL_RATE            — optional, USD→BRL rate override (default: 5.20)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

const ABACATE_BASE = "https://api.abacatepay.com/v2";
const BRL_RATE     = () => Number(process.env.BRL_RATE ?? 5.20);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!rateLimit(`abacate-create:${session.user.id}`, 5, 60_000))
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });

  const key = process.env.ABACATEPAY_API_KEY;
  if (!key) return NextResponse.json({ error: "PIX temporariamente indisponível" }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const amountUsd = Number(body.amount);
  if (!amountUsd || amountUsd < 10 || amountUsd > 50_000)
    return NextResponse.json({ error: "Valor inválido (min $10)" }, { status: 400 });

  // Convert USD → BRL cents
  const amountBrl      = amountUsd * BRL_RATE();
  const amountCents    = Math.round(amountBrl * 100);
  const externalId     = `${session.user.id}_${Date.now()}`;
  const baseUrl        = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const payload = {
    method: "PIX",
    data: {
      amount:      amountCents,
      description: `Depósito Prime Broker — $${amountUsd}`,
      externalId,
      expiresIn:   3600, // 1 hour
      metadata: {
        userId:    session.user.id,
        amountUsd: String(amountUsd),
      },
    },
  };

  const res = await fetch(`${ABACATE_BASE}/transparents/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    console.error("[AbacatePay] Create error:", data);
    return NextResponse.json({ error: "Erro ao gerar PIX" }, { status: 502 });
  }

  const charge = data.data;

  return NextResponse.json({
    id:            charge.id,
    brCode:        charge.brCode,        // PIX copia-e-cola
    brCodeBase64:  charge.brCodeBase64,  // QR code image (base64 PNG)
    amountBrl:     amountBrl.toFixed(2),
    amountUsd,
    expiresAt:     charge.expiresAt,
    status:        charge.status,
    checkUrl:      `${baseUrl}/api/payments/abacatepay/status?id=${charge.id}`,
  });
}
