import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status") ?? "PENDING";
  const page   = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
  const limit  = 25;

  const where = status === "ALL" ? {} : { status };

  const [withdrawals, total] = await Promise.all([
    prisma.withdrawal.findMany({
      where,
      select: {
        id: true, amount: true, method: true, details: true, status: true, createdAt: true,
        user: { select: { id: true, name: true, email: true, realBalance: true } },
      },
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.withdrawal.count({ where }),
  ]);

  return NextResponse.json({ withdrawals, total, page, pages: Math.ceil(total / limit) });
}
