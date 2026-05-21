import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { randomBytes } from "crypto";
import { rateLimit } from "@/lib/rateLimit";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!rateLimit(`resend-verify:${session.user.id}`, 3, 3_600_000))
    return NextResponse.json({ error: "Muitas tentativas" }, { status: 429 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ message: "Já verificado" });

  const verifyToken = randomBytes(32).toString("hex");
  await prisma.user.update({ where: { id: user.id }, data: { verifyToken } });
  await sendVerificationEmail(user.email, user.name, verifyToken);

  return NextResponse.json({ message: "Email enviado" });
}
