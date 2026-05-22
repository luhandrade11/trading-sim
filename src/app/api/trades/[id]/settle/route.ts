import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { PAYOUT_RATE, MAX_EXIT_PRICE_MULTIPLIER } from "@/lib/constants";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!rateLimit(`settle:${session.user.id}`, 30, 60_000))
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const { exitPrice, won: wonOverride } = body;
  if (typeof exitPrice !== "number" || exitPrice <= 0)
    return NextResponse.json({ error: "Preço de saída inválido" }, { status: 400 });

  const trade = await prisma.trade.findUnique({ where: { id } });
  if (!trade || trade.userId !== session.user.id)
    return NextResponse.json({ error: "Operação não encontrada" }, { status: 404 });

  // Idempotent — already settled
  if (trade.result !== "PENDING") return NextResponse.json(trade);

  // Reject settlement if trade hasn't expired yet (10s grace window)
  if (new Date(trade.expiresAt).getTime() > Date.now() + 10_000)
    return NextResponse.json({ error: "Operação ainda não expirou" }, { status: 400 });

  // Sanity cap
  if (exitPrice > trade.entryPrice * MAX_EXIT_PRICE_MULTIPLIER)
    return NextResponse.json({ error: "Preço de saída suspeito" }, { status: 400 });

  // Use the sim-chart verdict when available (client compared sim entry vs sim exit price).
  // Fall back to real-price comparison only when the client didn't supply a verdict.
  const won = typeof wonOverride === "boolean"
    ? wonOverride
    : (trade.direction === "UP"   && exitPrice >= trade.entryPrice) ||
      (trade.direction === "DOWN" && exitPrice <= trade.entryPrice);

  const profit = won ? trade.amount * PAYOUT_RATE : 0;
  const result = won ? "WIN" : "LOSS";

  const isReal = trade.mode === "real";

  const [updated] = await prisma.$transaction([
    prisma.trade.update({ where: { id }, data: { exitPrice, result, profit } }),
    prisma.user.update({
      where: { id: session.user.id },
      data: isReal
        ? { realBalance: { increment: won ? trade.amount + profit : 0 } }
        : { balance:     { increment: won ? trade.amount + profit : 0 } },
    }),
  ]);

  // Cascade affiliate commissions on real loss
  // Each level earns: (their commissionRate - their direct sub's rate) * tradeLoss
  if (isReal && !won) {
    (async () => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { affiliateId: true },
        });
        if (!user?.affiliateId) return;

        // Walk up the affiliate chain building [directAffiliate, parent, grandparent, ...]
        type AffRow = { id: string; commissionRate: number; parentAffiliateId: string | null };
        const chain: AffRow[] = [];
        let currentId: string | null = user.affiliateId;
        while (currentId && chain.length < 10) {
          const aff: AffRow | null = await prisma.affiliate.findUnique({
            where: { id: currentId },
            select: { id: true, commissionRate: true, parentAffiliateId: true },
          });
          if (!aff) break;
          chain.push(aff);
          currentId = aff.parentAffiliateId;
        }
        if (chain.length === 0) return;

        // Build DB operations: each affiliate earns (their rate - child's rate) of the loss
        const ops: ReturnType<typeof prisma.affiliate.update | typeof prisma.affiliateRevenue.create>[] = [];
        let childRate = 0;
        for (const aff of chain) {
          const earnRate = aff.commissionRate - childRate;
          if (earnRate > 0.0001) {
            const commission = Math.round(trade.amount * earnRate * 100) / 100;
            if (commission > 0) {
              ops.push(
                prisma.affiliate.update({
                  where: { id: aff.id },
                  data: { balance: { increment: commission }, totalEarned: { increment: commission } },
                }),
                prisma.affiliateRevenue.create({
                  data: { affiliateId: aff.id, userId: session.user.id, tradeId: id, amount: commission },
                })
              );
            }
          }
          childRate = aff.commissionRate;
        }

        if (ops.length > 0) await prisma.$transaction(ops);
      } catch (err) {
        console.error("[settle] affiliate cascade error:", err);
      }
    })();
  }

  return NextResponse.json(updated);
}
