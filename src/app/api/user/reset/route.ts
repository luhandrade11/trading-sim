import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STARTING_BALANCE } from "@/lib/constants";

const COOLDOWN_HOURS  = 24;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { lastDemoReset: true },
  });

  // Enforce 24h cooldown
  if (user?.lastDemoReset) {
    const hoursSince = (Date.now() - user.lastDemoReset.getTime()) / 3_600_000;
    if (hoursSince < COOLDOWN_HOURS) {
      const nextReset = new Date(user.lastDemoReset.getTime() + COOLDOWN_HOURS * 3_600_000);
      return NextResponse.json(
        { error: `Próximo reset disponível em ${nextReset.toLocaleString("pt-BR")}`, nextReset },
        { status: 429 }
      );
    }
  }

  await prisma.$transaction([
    prisma.trade.deleteMany({ where: { userId: session.user.id, mode: "demo" } }),
    prisma.user.update({
      where: { id: session.user.id },
      data:  { balance: STARTING_BALANCE, lastDemoReset: new Date() },
    }),
  ]);

  return NextResponse.json({ balance: STARTING_BALANCE });
}
