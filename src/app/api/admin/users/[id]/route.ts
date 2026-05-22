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

  const { id }  = await params;
  const body    = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const data: Record<string, unknown> = {};

  if (typeof body.winRateOverride === "number") {
    if (body.winRateOverride < 0 || body.winRateOverride > 100)
      return NextResponse.json({ error: "winRateOverride deve ser 0-100" }, { status: 400 });
    data.winRateOverride = body.winRateOverride;
  }
  if (body.winRateOverride === null) data.winRateOverride = null;

  if (typeof body.isBlocked === "boolean") data.isBlocked = body.isBlocked;
  if (typeof body.adminNote === "string")  data.adminNote = body.adminNote.slice(0, 500);

  if (typeof body.balance === "number" && body.balance >= 0)      data.balance      = body.balance;
  if (typeof body.realBalance === "number" && body.realBalance >= 0) data.realBalance = body.realBalance;

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Nenhum campo válido" }, { status: 400 });

  const user = await prisma.user.update({ where: { id }, data }).catch(() => null);
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, balance: true, realBalance: true,
      isBlocked: true, winRateOverride: true, adminNote: true,
      createdAt: true, referralCode: true,
      trades: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, asset: true, direction: true, amount: true, result: true, profit: true, mode: true, createdAt: true },
      },
      withdrawals: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, amount: true, method: true, status: true, createdAt: true },
      },
      _count: { select: { trades: true, withdrawals: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(user);
}
