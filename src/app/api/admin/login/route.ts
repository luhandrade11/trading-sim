import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminToken, COOKIE_NAME } from "@/lib/adminAuth";
import { rateLimit } from "@/lib/rateLimit";
import { verifyTotp } from "@/lib/totp";
import { writeAuditLog } from "@/lib/auditLog";

function getIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  // 5 attempts per 15 minutes per IP
  if (!rateLimit(`admin-login:${ip}`, 5, 15 * 60_000))
    return NextResponse.json({ error: "Muitas tentativas. Aguarde 15 minutos." }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const { email, password, totpToken } = body;

  const adminEmail    = process.env.ADMIN_EMAIL;
  const adminPassHash = process.env.ADMIN_PASSWORD_HASH;
  const totpSecret    = process.env.ADMIN_TOTP_SECRET;

  if (!adminEmail || !adminPassHash) {
    return NextResponse.json({ error: "Admin não configurado" }, { status: 503 });
  }

  const emailMatch = email === adminEmail;
  const passMatch  = await bcrypt.compare(String(password), adminPassHash);

  if (!emailMatch || !passMatch) {
    writeAuditLog("admin", "admin", "admin_login_failed", undefined, { ip, reason: "wrong_credentials" });
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  // If 2FA is enabled, require TOTP token
  if (totpSecret) {
    if (!totpToken) {
      return NextResponse.json({ error: "Código 2FA obrigatório", requires2fa: true }, { status: 401 });
    }
    if (!verifyTotp(totpSecret, String(totpToken))) {
      writeAuditLog("admin", "admin", "admin_login_failed", undefined, { ip, reason: "wrong_2fa" });
      return NextResponse.json({ error: "Código 2FA inválido" }, { status: 401 });
    }
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

  writeAuditLog("admin", "admin", "admin_login_success", undefined, { ip });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
