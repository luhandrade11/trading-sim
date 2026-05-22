import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;

  const affiliate = await prisma.affiliate.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true,
      commissionRate: true, level: true, balance: true, totalEarned: true,
      pixKey: true, parentAffiliateId: true, status: true, createdAt: true,
      parentAffiliate: { select: { id: true, name: true, email: true } },
      subAffiliates: { select: { id: true, name: true, email: true, level: true, commissionRate: true, _count: { select: { referredUsers: true } } } },
      referredUsers: { select: { id: true, name: true, email: true, realBalance: true, affiliateLinkSlug: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 50 },
      withdrawals: { orderBy: { createdAt: "desc" }, take: 20 },
      _count: { select: { referredUsers: true, subAffiliates: true, revenues: true, withdrawals: true } },
    },
  });

  if (!affiliate) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(affiliate);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.commissionRate !== undefined) {
    const rate = Number(body.commissionRate);
    if (rate < 0 || rate > 1) return NextResponse.json({ error: "Taxa inválida (0–1)" }, { status: 400 });
    data.commissionRate = rate;
  }
  if (body.balance !== undefined) data.balance = Number(body.balance);
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.level !== undefined) {
    const lvl = Math.min(4, Math.max(1, Number(body.level)));
    data.level = lvl;
  }
  if (body.status !== undefined) {
    const validStatuses = ["ACTIVE", "PENDING", "BLOCKED", "REJECTED"];
    if (!validStatuses.includes(body.status)) return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    data.status = body.status;
  }

  const updated = await prisma.affiliate.update({ where: { id }, data });
  return NextResponse.json({ ok: true, commissionRate: updated.commissionRate, balance: updated.balance });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;

  // Detach all players and sub-affiliates before deleting
  await prisma.$transaction([
    prisma.user.updateMany({ where: { affiliateId: id }, data: { affiliateId: null, affiliateLinkSlug: null } }),
    prisma.affiliate.updateMany({ where: { parentAffiliateId: id }, data: { parentAffiliateId: null } }),
  ]);

  await prisma.affiliate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
