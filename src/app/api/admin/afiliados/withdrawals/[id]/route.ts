import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { sendWithdrawalApprovedEmail, sendWithdrawalRejectedEmail } from "@/lib/email";
import { writeAuditLog } from "@/lib/auditLog";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action as "APPROVED" | "REJECTED";

  if (action !== "APPROVED" && action !== "REJECTED")
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });

  const withdrawal = await prisma.affiliateWithdrawal.findUnique({
    where: { id },
    include: { affiliate: { select: { email: true, name: true } } },
  });
  if (!withdrawal || withdrawal.status !== "PENDING")
    return NextResponse.json({ error: "Saque não encontrado ou já processado" }, { status: 404 });

  if (action === "APPROVED") {
    await prisma.affiliateWithdrawal.update({ where: { id }, data: { status: "APPROVED" } });
    sendWithdrawalApprovedEmail(withdrawal.affiliate.email, withdrawal.affiliate.name, withdrawal.amount);
  } else {
    await prisma.$transaction([
      prisma.affiliateWithdrawal.update({ where: { id }, data: { status: "REJECTED" } }),
      prisma.affiliate.update({
        where: { id: withdrawal.affiliateId },
        data: { balance: { increment: withdrawal.amount } },
      }),
    ]);
    sendWithdrawalRejectedEmail(withdrawal.affiliate.email, withdrawal.affiliate.name, withdrawal.amount);
  }

  writeAuditLog("admin", "admin", `affiliate_withdrawal_${action.toLowerCase()}`, id, {
    affiliateId: withdrawal.affiliateId,
    amount: withdrawal.amount,
  });

  return NextResponse.json({ ok: true });
}
