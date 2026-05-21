import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { sendVerificationEmail } from "@/lib/email";
import { randomBytes } from "crypto";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`register:${getIp(req)}`, 5, 3_600_000))
    return NextResponse.json({ error: "Muitas tentativas. Tente mais tarde." }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const { name, email, password } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2)
    return NextResponse.json({ error: "Nome deve ter pelo menos 2 caracteres" }, { status: 400 });
  if (!email || !EMAIL_REGEX.test(email))
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  if (!password || typeof password !== "string" || password.length < 6)
    return NextResponse.json({ error: "Senha deve ter pelo menos 6 caracteres" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 });

  const hashed      = await bcrypt.hash(password, 10);
  const verifyToken = randomBytes(32).toString("hex");

  const user = await prisma.user.create({
    data: {
      name:         name.trim(),
      email:        email.toLowerCase(),
      password:     hashed,
      verifyToken,
      emailVerified: false,
    },
  });

  // Send verification email (non-blocking — failure doesn't prevent registration)
  sendVerificationEmail(user.email, user.name, verifyToken).catch((err) =>
    console.error("[register] Failed to send verification email:", err)
  );

  return NextResponse.json({ id: user.id, name: user.name, email: user.email });
}
