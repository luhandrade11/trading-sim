// BravoPay — Poll transaction status by external_reference.
// Called by frontend every 4 s after PIX is shown.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { rateLimit }                 from "@/lib/rateLimit";
import { prisma }                    from "@/lib/prisma";
import { writeAuditLog }             from "@/lib/auditLog";

const BRAVOPAY_BASE  = "https://bravopay.solutions/api/v1";
const BRL_RATE       = () => Number(process.env.BRL_RATE ?? 5.20);
const AFFILIATE_RATE = 0.10;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!rateLimit(`bravopay-status:${session.user.id}`, 40, 60_000))
    return NextResponse.json({ status: "PENDING" });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  // Look up our pending deposit
  const log = await prisma.depositLog.findUnique({ where: { externalId: id } });
  if (!log || log.userId !== session.user.id)
    return NextResponse.json({ status: "NOT_FOUND" });

  if (log.status === "completed")
    return NextResponse.json({ status: "PAID" });

  const key = process.env.BRAVOPAY_API_KEY;
  if (!key) return NextResponse.json({ status: "PENDING" });

  // Query BravoPay for this specific transaction by external_reference
  try {
    const res = await fetch(
      `${BRAVOPAY_BASE}/transactions?external_reference=${encodeURIComponent(id)}`,
      { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" },
    );

    if (!res.ok) return NextResponse.json({ status: "PENDING" });

    const data  = await res.json();
    const txs: Array<{ id: string; status: string }> =
      Array.isArray(data) ? data : (data?.data ?? []);

    const paid = txs.find((tx) => tx.status === "PAID");
    if (!paid) return NextResponse.json({ status: "PENDING" });

    // Credit balance (idempotent, atomic)
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.depositLog.findUnique({ where: { externalId: id } });
      if (fresh?.status === "completed") return;

      const user = await tx.user.findUnique({
        where:  { id: session.user.id },
        select: { referredBy: true, firstDepositDone: true },
      });

      const settingRow = await tx.adminSettings
        .findUnique({ where: { key: "firstDepositBonusPct" } })
        .catch(() => null);
      const bonusPct    = settingRow ? Number(settingRow.value) : 50;
      const isFirst     = !!(user && !user.firstDepositDone);
      const bonus       = isFirst && bonusPct > 0
        ? Math.round(log.amount * (bonusPct / 100) * 100) / 100
        : 0;

      await tx.depositLog.update({ where: { externalId: id }, data: { status: "completed" } });

      await tx.user.update({
        where: { id: session.user.id },
        data: isFirst
          ? { realBalance: { increment: log.amount + bonus }, firstDepositDone: true, totalDeposited: { increment: log.amount } }
          : { realBalance: { increment: log.amount }, totalDeposited: { increment: log.amount } },
      });

      if (user?.referredBy) {
        const commission = Math.round(log.amount * AFFILIATE_RATE * 100) / 100;
        await tx.user.update({
          where: { id: user.referredBy },
          data:  { realBalance: { increment: commission } },
        });
        await tx.affiliateEarning.create({
          data: {
            userId:        user.referredBy,
            referredId:    session.user.id,
            depositAmount: log.amount,
            commission,
          },
        });
      }
    });

    writeAuditLog(session.user.id, "user", "deposit_confirmed", session.user.id, {
      provider: "bravopay", amountUsd: log.amount, transactionId: paid.id,
    });

    console.log(`[BravoPay] ✓ $${log.amount} → user ${session.user.id}`);
    return NextResponse.json({ status: "PAID" });
  } catch (e) {
    console.error("[BravoPay] Status error:", e);
    return NextResponse.json({ status: "PENDING" });
  }
}
