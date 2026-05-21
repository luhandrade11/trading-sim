import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!rateLimit(`profile:${session.user.id}`, 10, 60_000))
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const { name, currentPassword, newPassword, image } = body;
  const updates: { name?: string; password?: string; image?: string } = {};

  if (image !== undefined) {
    if (typeof image !== "string") return NextResponse.json({ error: "Imagem inválida" }, { status: 400 });
    if (image !== "" && !image.startsWith("data:image/"))
      return NextResponse.json({ error: "Formato de imagem inválido" }, { status: 400 });
    if (image.length > 300_000)
      return NextResponse.json({ error: "Imagem muito grande (máx 200KB)" }, { status: 400 });
    updates.image = image;
  }

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2)
      return NextResponse.json({ error: "Nome deve ter pelo menos 2 caracteres" }, { status: 400 });
    updates.name = name.trim();
  }

  if (newPassword !== undefined) {
    if (typeof newPassword !== "string" || newPassword.length < 6)
      return NextResponse.json({ error: "Nova senha deve ter pelo menos 6 caracteres" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    const valid = await bcrypt.compare(currentPassword ?? "", user.password);
    if (!valid) return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });

    updates.password = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: updates,
    select: { id: true, name: true, email: true, balance: true, image: true },
  });

  return NextResponse.json(updated);
}
