import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminToken, COOKIE_NAME } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const { email, password } = body;

  const adminEmail    = process.env.ADMIN_EMAIL;
  const adminPassHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !adminPassHash) {
    return NextResponse.json({ error: "Admin não configurado" }, { status: 503 });
  }

  const emailMatch = email === adminEmail;
  const passMatch  = await bcrypt.compare(String(password), adminPassHash);

  if (!emailMatch || !passMatch) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const token = createAdminToken();
  const res   = NextResponse.json({ ok: true });

  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   7 * 24 * 60 * 60,
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
