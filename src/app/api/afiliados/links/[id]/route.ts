import { NextRequest, NextResponse } from "next/server";
import { getAffiliateSession } from "@/lib/affiliateAuth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const affiliateId = await getAffiliateSession();
  if (!affiliateId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const link = await prisma.affiliateLink.findUnique({ where: { id } });
  if (!link || link.affiliateId !== affiliateId)
    return NextResponse.json({ error: "Link não encontrado" }, { status: 404 });

  await prisma.affiliateLink.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const affiliateId = await getAffiliateSession();
  if (!affiliateId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const link = await prisma.affiliateLink.findUnique({ where: { id } });
  if (!link || link.affiliateId !== affiliateId)
    return NextResponse.json({ error: "Link não encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });

  const updated = await prisma.affiliateLink.update({ where: { id }, data: { title } });
  return NextResponse.json(updated);
}
