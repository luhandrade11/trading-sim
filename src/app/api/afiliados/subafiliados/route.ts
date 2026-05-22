import { NextResponse } from "next/server";
import { getAffiliateSession } from "@/lib/affiliateAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const affiliateId = await getAffiliateSession();
  if (!affiliateId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const subs = await prisma.affiliate.findMany({
    where: { parentAffiliateId: affiliateId },
    select: {
      id: true, name: true, email: true,
      commissionRate: true, level: true, status: true,
      balance: true, totalEarned: true, createdAt: true,
      _count: { select: { referredUsers: true, subAffiliates: true, revenues: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(subs);
}
