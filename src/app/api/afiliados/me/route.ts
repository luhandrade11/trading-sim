import { NextResponse } from "next/server";
import { getAffiliateSession } from "@/lib/affiliateAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const affiliateId = await getAffiliateSession();
  if (!affiliateId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
    select: { id: true, name: true, email: true, balance: true, totalEarned: true, pixKey: true, commissionRate: true, level: true, parentAffiliateId: true, photo: true, phone: true, cpf: true, docType: true, docNumber: true, lastWithdrawalAt: true, createdAt: true, status: true },
  });
  if (!affiliate) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  if (affiliate.status !== "ACTIVE")
    return NextResponse.json({ error: "Conta não ativa", statusCode: affiliate.status }, { status: 403 });

  return NextResponse.json(affiliate);
}

export async function PATCH(req: Request) {
  const affiliateId = await getAffiliateSession();
  if (!affiliateId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const data: Record<string, string | null> = {};
  if (body.name) data.name = String(body.name).trim().slice(0, 100);
  if (body.pixKey !== undefined) data.pixKey = body.pixKey ? String(body.pixKey).slice(0, 200) : null;
  if (body.phone !== undefined) data.phone = body.phone ? String(body.phone).slice(0, 30) : null;
  if (body.cpf !== undefined) data.cpf = body.cpf ? String(body.cpf).replace(/\D/g, "").slice(0, 14) : null;
  if (body.docType !== undefined) data.docType = body.docType ? String(body.docType).slice(0, 20) : null;
  if (body.docNumber !== undefined) data.docNumber = body.docNumber ? String(body.docNumber).slice(0, 30) : null;
  if (body.photo !== undefined) data.photo = body.photo ? String(body.photo).slice(0, 500) : null;

  const updated = await prisma.affiliate.update({ where: { id: affiliateId }, data });
  return NextResponse.json({ ok: true, name: updated.name, pixKey: updated.pixKey });
}
