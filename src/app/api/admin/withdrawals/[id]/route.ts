import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body   = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const { action } = body;
  if (action !== "APPROVE" && action !== "REJECT") {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }

  const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
  if (!withdrawal) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (withdrawal.status !== "PENDING")
    return NextResponse.json({ error: "Já processado" }, { status: 400 });

  if (action === "APPROVE") {
    // Deduct balance only if still has enough
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: withdrawal.userId } });
      if (!user || user.realBalance < withdrawal.amount)
        throw new Error("insufficient");

      await tx.withdrawal.update({ where: { id }, data: { status: "APPROVED" } });
      await tx.user.update({
        where: { id: withdrawal.userId },
        data:  { realBalance: { decrement: withdrawal.amount } },
      });
    }).catch((e) => {
      if ((e as Error).message === "insufficient")
        throw Object.assign(new Error("insufficient"), { code: 400 });
      throw e;
    });
  } else {
    await prisma.withdrawal.update({ where: { id }, data: { status: "REJECTED" } });
  }

  return NextResponse.json({ ok: true });
}
