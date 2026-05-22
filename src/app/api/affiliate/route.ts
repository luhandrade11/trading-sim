import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  let user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { referralCode: true },
  });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  // Generate code for legacy users who registered before affiliate system
  if (!user.referralCode) {
    const code = randomBytes(4).toString("hex").toUpperCase();
    user = await prisma.user.update({
      where: { id: session.user.id },
      data:  { referralCode: code },
      select: { referralCode: true },
    });
  }

  const [earnings, referredCount] = await Promise.all([
    prisma.affiliateEarning.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { depositAmount: true, commission: true, createdAt: true },
    }),
    prisma.user.count({ where: { referredBy: session.user.id } }),
  ]);

  const totalEarned = earnings.reduce((s, e) => s + e.commission, 0);

  return NextResponse.json({
    referralCode: user.referralCode,
    referredCount,
    totalEarned,
    recentEarnings: earnings,
  });
}
