import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.missionId) {
    return NextResponse.json({ error: "missionId obrigatório" }, { status: 400 });
  }

  const mission = await prisma.dailyMission.findUnique({
    where: { id: body.missionId },
  });

  if (!mission) {
    return NextResponse.json({ error: "Missão não encontrada" }, { status: 404 });
  }
  if (mission.userId !== session.user.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }
  if (mission.claimed) {
    return NextResponse.json({ error: "Missão já reivindicada" }, { status: 400 });
  }
  if (mission.progress < mission.target) {
    return NextResponse.json({ error: "Missão ainda não completa" }, { status: 400 });
  }

  const [updatedMission, updatedUser] = await prisma.$transaction([
    prisma.dailyMission.update({
      where: { id: mission.id },
      data:  { claimed: true },
    }),
    prisma.user.update({
      where:  { id: session.user.id },
      data:   { balance: { increment: mission.rewardUsd } },
      select: { balance: true },
    }),
  ]);

  return NextResponse.json({
    ok:         true,
    reward:     mission.rewardUsd,
    newBalance: updatedUser.balance,
  });
}
