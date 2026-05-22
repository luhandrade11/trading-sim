import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createAffiliateToken, AFFILIATE_COOKIE } from "@/lib/affiliateAuth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const affiliate = await prisma.affiliate.findUnique({ where: { email: body.email } });
  if (!affiliate) return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });

  const valid = await bcrypt.compare(body.password, affiliate.password);
  if (!valid) return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });

  if (affiliate.status === "PENDING")
    return NextResponse.json({ error: "Sua conta está aguardando aprovação. Aguarde o contato do responsável.", statusCode: "PENDING" }, { status: 403 });
  if (affiliate.status === "REJECTED")
    return NextResponse.json({ error: "Sua inscrição foi recusada. Entre em contato com o suporte.", statusCode: "REJECTED" }, { status: 403 });
  if (affiliate.status === "BLOCKED")
    return NextResponse.json({ error: "Sua conta foi bloqueada. Entre em contato com o suporte.", statusCode: "BLOCKED" }, { status: 403 });

  const token = createAffiliateToken(affiliate.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AFFILIATE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });
  return res;
}
