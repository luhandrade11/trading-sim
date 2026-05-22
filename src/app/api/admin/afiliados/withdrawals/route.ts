import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PENDING";

  const withdrawals = await prisma.affiliateWithdrawal.findMany({
    where: status === "ALL" ? {} : { status },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { affiliate: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(withdrawals);
}
