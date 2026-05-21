import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEMO_BALANCE = 10000;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  await prisma.$transaction([
    prisma.trade.deleteMany({ where: { userId: session.user.id } }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { balance: DEMO_BALANCE },
    }),
  ]);

  return NextResponse.json({ balance: DEMO_BALANCE });
}
