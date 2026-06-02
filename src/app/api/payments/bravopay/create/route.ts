// BravoPay — Create PIX charge directly (no product/checkout needed)
// Env vars: BRAVOPAY_API_KEY, BRL_RATE (optional, default 5.20)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { rateLimit }                 from "@/lib/rateLimit";
import { prisma }                    from "@/lib/prisma";

const BRAVOPAY_BASE = "https://bravopay.solutions/api/v1";
const BRL_RATE      = () => Number(process.env.BRL_RATE ?? 5.20);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!rateLimit(`bravopay-create:${session.user.id}`, 5, 60_000))
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });

  const key = process.env.BRAVOPAY_API_KEY;
  if (!key)
    return NextResponse.json({ error: "Gateway indisponível" }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  // Parse amount
  let amountBrl: number;
  let amountUsd: number;

  if (body.amountBrl) {
    amountBrl = Number(body.amountBrl);
    if (!amountBrl || amountBrl < 20 || amountBrl > 250_000)
      return NextResponse.json({ error: "Valor inválido (min R$20)" }, { status: 400 });
    amountUsd = Math.round((amountBrl / BRL_RATE()) * 100) / 100;
  } else {
    amountUsd = Number(body.amount);
    if (!amountUsd || amountUsd < 4 || amountUsd > 50_000)
      return NextResponse.json({ error: "Valor inválido (min $4)" }, { status: 400 });
    amountBrl = Math.round(amountUsd * BRL_RATE() * 100) / 100;
  }

  const amountCents      = Math.round(amountBrl * 100);
  const externalReference = `pb_${session.user.id.slice(-8)}_${Date.now()}`;

  const ac  = new AbortController();
  const tid = setTimeout(() => ac.abort(), 12_000);

  try {
    const res = await fetch(`${BRAVOPAY_BASE}/transactions`, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount_cents:       amountCents,
        method:             "pix",
        description:        `Depósito Prime Broker — $${amountUsd.toFixed(2)}`,
        external_reference: externalReference,
        expires_in:         3600,
        customer: {
          email: session.user.email ?? undefined,
          name:  session.user.name  ?? undefined,
        },
      }),
      signal: ac.signal,
    });

    clearTimeout(tid);

    const data = await res.json();

    if (!res.ok) {
      console.error("[BravoPay] Create error:", data);
      return NextResponse.json({ error: "Gateway indisponível" }, { status: 502 });
    }

    const txId     = data?.id as string | undefined;
    const copyPaste = data?.pix?.copy_paste as string | undefined;
    const expiresAt = data?.pix?.expires_at as string | undefined;

    if (!txId || !copyPaste) {
      console.error("[BravoPay] Missing id/copy_paste in response:", data);
      return NextResponse.json({ error: "Gateway: resposta inválida" }, { status: 502 });
    }

    // Persist pending deposit (externalId = external_reference for polling)
    await prisma.depositLog.create({
      data: {
        userId:     session.user.id,
        externalId: externalReference,
        amount:     amountUsd,
        currency:   "brl",
        provider:   "bravopay",
        status:     "pending",
      },
    });

    return NextResponse.json({
      id:         externalReference,   // used for status polling
      txId,
      copyPaste,
      expiresAt,
      amountBrl:  amountBrl.toFixed(2),
      amountUsd,
    });
  } catch (e) {
    clearTimeout(tid);
    const isAbort = (e as Error)?.name === "AbortError";
    return NextResponse.json(
      { error: isAbort ? "Gateway timeout" : "Erro interno" },
      { status: 502 },
    );
  }
}
