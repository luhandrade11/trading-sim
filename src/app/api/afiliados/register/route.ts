import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createAffiliateToken, AFFILIATE_COOKIE } from "@/lib/affiliateAuth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.password)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { name, email, password, parentRef } = body;

  if (password.length < 6)
    return NextResponse.json({ error: "Senha mínima de 6 caracteres" }, { status: 400 });

  const exists = await prisma.affiliate.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });

  // Resolve parent affiliate if recruited by one
  let parentAffiliateId: string | undefined;
  let level = 1;
  if (parentRef && typeof parentRef === "string") {
    const parent = await prisma.affiliate.findUnique({
      where: { id: parentRef },
      select: { id: true, level: true },
    }).catch(() => null);
    if (parent) {
      // Treat null/0 as level 1 defensively; cap at 4 (level 4 cannot recruit)
      const parentLevel = Math.max(1, parent.level ?? 1);
      if (parentLevel < 4) {
        parentAffiliateId = parent.id;
        level = parentLevel + 1;
      }
    }
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.affiliate.create({
    data: {
      name, email, password: hash, level,
      status: "PENDING",
      ...(parentAffiliateId ? { parentAffiliateId } : {}),
    },
  });

  // Return pending — no cookie, user must wait for approval
  return NextResponse.json({ ok: true, pending: true });
}
