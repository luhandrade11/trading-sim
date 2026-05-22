import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createAffiliateToken, AFFILIATE_COOKIE } from "@/lib/affiliateAuth";
import { rateLimit } from "@/lib/rateLimit";
import { sendNewSubAffiliateEmail } from "@/lib/email";

function getIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  // 5 registrations per hour per IP
  if (!rateLimit(`aff-register:${getIp(req)}`, 5, 3_600_000))
    return NextResponse.json({ error: "Muitas tentativas. Tente mais tarde." }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.password)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { name, email, password, parentRef } = body;

  if (typeof name !== "string" || name.trim().length < 2)
    return NextResponse.json({ error: "Nome deve ter pelo menos 2 caracteres" }, { status: 400 });
  if (!EMAIL_REGEX.test(email))
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  if (typeof password !== "string" || password.length < 6)
    return NextResponse.json({ error: "Senha mínima de 6 caracteres" }, { status: 400 });

  const exists = await prisma.affiliate.findUnique({ where: { email: email.toLowerCase() } });
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
      name: name.trim(), email: email.toLowerCase(), password: hash, level,
      status: "PENDING",
      ...(parentAffiliateId ? { parentAffiliateId } : {}),
    },
  });

  // Notify parent affiliate about the pending sub-affiliate
  if (parentAffiliateId) {
    const parent = await prisma.affiliate.findUnique({
      where: { id: parentAffiliateId },
      select: { email: true, name: true },
    }).catch(() => null);
    if (parent) sendNewSubAffiliateEmail(parent.email, parent.name, name.trim());
  }

  // Return pending — no cookie, user must wait for approval
  return NextResponse.json({ ok: true, pending: true });
}
