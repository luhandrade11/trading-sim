import { NextRequest, NextResponse } from "next/server";
import { getAffiliateSession } from "@/lib/affiliateAuth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const affiliateId = await getAffiliateSession();
  if (!affiliateId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: subId } = await params;

  // Verify this sub-affiliate is a direct child of the current affiliate
  const [me, sub] = await Promise.all([
    prisma.affiliate.findUnique({ where: { id: affiliateId }, select: { commissionRate: true, level: true, status: true } }),
    prisma.affiliate.findUnique({ where: { id: subId }, select: { id: true, parentAffiliateId: true, level: true, status: true } }),
  ]);

  if (!me || me.status !== "ACTIVE") return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  if (!sub || sub.parentAffiliateId !== affiliateId)
    return NextResponse.json({ error: "Sub-afiliado não encontrado na sua rede" }, { status: 404 });

  const body = await req.json().catch(() => null);

  // Block / unblock action
  if (body?.action === "block" || body?.action === "unblock") {
    if (sub.status === "PENDING")
      return NextResponse.json({ error: "Use a área de aprovações para afiliados pendentes" }, { status: 400 });
    const newStatus = body.action === "block" ? "BLOCKED" : "ACTIVE";
    await prisma.affiliate.update({ where: { id: subId }, data: { status: newStatus } });
    return NextResponse.json({ ok: true, status: newStatus });
  }

  // Commission rate change
  if (me.level >= 4)
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const newRatePct = Number(body?.commissionRate);

  if (isNaN(newRatePct) || newRatePct < 0 || newRatePct > 100)
    return NextResponse.json({ error: "Taxa inválida" }, { status: 400 });

  const newRate = newRatePct / 100;

  if (newRate > me.commissionRate)
    return NextResponse.json({
      error: `Máximo permitido: ${Math.round(me.commissionRate * 100)}% (sua taxa atual)`,
    }, { status: 400 });

  const updated = await prisma.affiliate.update({
    where: { id: subId },
    data: { commissionRate: newRate },
    select: { id: true, name: true, commissionRate: true },
  });

  return NextResponse.json({ ok: true, commissionRate: updated.commissionRate });
}
