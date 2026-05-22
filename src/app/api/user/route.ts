import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, name: true, email: true, balance: true, realBalance: true,
        image: true, emailVerified: true, lastDemoReset: true,
        winRateOverride: true, isBlocked: true,
      },
    }),
    prisma.adminSettings.findMany({
      where: { key: { in: ["globalDemoRate", "globalRealRate"] } },
    }),
  ]);

  if (!user) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (user.isBlocked) return NextResponse.json({ error: "Conta bloqueada" }, { status: 403 });

  const settingsMap: Record<string, string> = {};
  for (const s of settings) settingsMap[s.key] = s.value;

  return NextResponse.json({
    ...user,
    globalDemoRate: settingsMap.globalDemoRate ? Number(settingsMap.globalDemoRate) : null,
    globalRealRate: settingsMap.globalRealRate ? Number(settingsMap.globalRealRate) : null,
  });
}
