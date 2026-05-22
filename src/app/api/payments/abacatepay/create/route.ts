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

  // Accept either amountUsd (USD input) or amountBrl (BRL input from BR users)
  let amountUsd: number;
  let amountBrl: number;

  if (body.amountBrl) {
    amountBrl = Number(body.amountBrl);
    if (!amountBrl || amountBrl < 50 || amountBrl > 250_000)
      return NextResponse.json({ error: "Valor inválido (min R$50)" }, { status: 400 });
    amountUsd = Math.round((amountBrl / BRL_RATE()) * 100) / 100;
  } else {
    amountUsd = Number(body.amount);
    if (!amountUsd || amountUsd < 10 || amountUsd > 50_000)
      return NextResponse.json({ error: "Valor inválido (min $10)" }, { status: 400 });
    amountBrl = amountUsd * BRL_RATE();
  }

  const amountCents = Math.round(amountBrl * 100);
  const externalId  = `${session.user.id}_${Date.now()}`;
  const baseUrl     = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  // externalId must go inside metadata — it is NOT a valid top-level field
  const payload = {
    method: "PIX",
    data: {
      amount:      amountCents,
      description: `Depósito Prime Broker — $${amountUsd.toFixed(2)}`,
      expiresIn:   3600,
      metadata: {
        userId:     session.user.id,
        amountUsd:  String(amountUsd),
        externalId,
      },
    },
  };

  const ac  = new AbortController();
  const tid = setTimeout(() => ac.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch(`${ABACATE_BASE}/transparents/create`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ac.signal,
    });
  } catch {
    clearTimeout(tid);
    return NextResponse.json({ error: "PIX indisponível (timeout)" }, { status: 502 });
  }
  clearTimeout(tid);

  const data = await res.json();

  if (!res.ok || !data.success) {
    const msg = data?.error ?? data?.message ?? JSON.stringify(data);
    console.error("[AbacatePay] Create error:", msg);
    return NextResponse.json({ error: `PIX indisponível: ${msg}` }, { status: 502 });
  }

  const charge = data.data;

  // Ensure brCodeBase64 is a usable data URL
  const rawB64 = charge.brCodeBase64 ?? "";
  const brCodeBase64 = rawB64.startsWith("data:")
    ? rawB64
    : rawB64 ? `data:image/png;base64,${rawB64}` : "";

  return NextResponse.json({
    id:            charge.id,
    brCode:        charge.brCode,
    brCodeBase64,
    amountBrl:     amountBrl.toFixed(2),
    amountUsd,
    expiresAt:     charge.expiresAt,
    status:        charge.status,
    checkUrl:      `${baseUrl}/api/payments/abacatepay/status?id=${charge.id}`,
  });
}
