import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { generateTotpSecret, verifyTotp, getTotpUri } from "@/lib/totp";
import { writeAuditLog } from "@/lib/auditLog";

// GET: get current 2FA status and generate a new secret if not set
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const enabled = !!(process.env.ADMIN_TOTP_SECRET);
  return NextResponse.json({ enabled });
}

// POST: generate a new TOTP setup (returns secret + QR URI for scanning)
export async function POST() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const secret = generateTotpSecret();
  const uri    = getTotpUri(secret, "admin");

  // Return secret so admin can add it to env — we don't persist here, only after verify
  return NextResponse.json({ secret, uri });
}

// PATCH: verify a token against a pending secret (passed in body)
export async function PATCH(req: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.secret || !body?.token)
    return NextResponse.json({ error: "secret e token são obrigatórios" }, { status: 400 });

  const valid = verifyTotp(body.secret, String(body.token));
  if (!valid) return NextResponse.json({ error: "Código inválido" }, { status: 400 });

  writeAuditLog("admin", "admin", "2fa_verified_setup", undefined, { secret: body.secret.slice(0, 4) + "…" });

  // Instruct admin to set ADMIN_TOTP_SECRET env var
  return NextResponse.json({
    ok: true,
    message: "Token válido! Adicione a variável de ambiente ADMIN_TOTP_SECRET com o valor acima e faça redeploy.",
    secret: body.secret,
  });
}
