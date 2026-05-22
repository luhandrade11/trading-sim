import { NextRequest, NextResponse } from "next/server";
import { getAffiliateSession } from "@/lib/affiliateAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const affiliateId = await getAffiliateSession();
  if (!affiliateId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const pending = await prisma.affiliate.findMany({
    where: { parentAffiliateId: affiliateId, status: "PENDING" },
    select: { id: true, name: true, email: true, commissionRate: true, level: true, createdAt: true, phone: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(pending);
}

export async function PATCH(req: NextRequest) {
  const affiliateId = await getAffiliateSession();
  if (!affiliateId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.action)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { id: subId, action, commissionRate } = body;

  if (action !== "approve" && action !== "reject")
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });

  const [me, sub] = await Promise.all([
    prisma.affiliate.findUnique({ where: { id: affiliateId }, select: { commissionRate: true, level: true, status: true } }),
    prisma.affiliate.findUnique({ where: { id: subId }, select: { id: true, parentAffiliateId: true, status: true } }),
  ]);

  if (!me || me.status !== "ACTIVE") return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  if (!sub || sub.parentAffiliateId !== affiliateId)
    return NextResponse.json({ error: "Sub-afiliado não encontrado" }, { status: 404 });
  if (sub.status !== "PENDING")
    return NextResponse.json({ error: "Sub-afiliado não está pendente" }, { status: 400 });

  if (action === "approve") {
    const rate = commissionRate !== undefined ? Number(commissionRate) / 100 : 0.90;
    if (isNaN(rate) || rate < 0 || rate > me.commissionRate)
      return NextResponse.json({ error: `Taxa inválida (máx: ${Math.round(me.commissionRate * 100)}%)` }, { status: 400 });

    await prisma.affiliate.update({ where: { id: subId }, data: { status: "ACTIVE", commissionRate: rate } });
    return NextResponse.json({ ok: true, status: "ACTIVE" });
  } else {
    await prisma.affiliate.update({ where: { id: subId }, data: { status: "REJECTED" } });
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }
}
