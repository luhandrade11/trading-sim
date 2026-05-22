import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

// Move a player (userId) from their current affiliate to a new one (or null = no affiliate)
export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.userId) return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });

  const { userId, newAffiliateId } = body;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  if (newAffiliateId) {
    const aff = await prisma.affiliate.findUnique({ where: { id: newAffiliateId }, select: { id: true } });
    if (!aff) return NextResponse.json({ error: "Afiliado destino não encontrado" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      affiliateId: newAffiliateId ?? null,
      affiliateLinkSlug: null,
    },
  });

  return NextResponse.json({ ok: true });
}
