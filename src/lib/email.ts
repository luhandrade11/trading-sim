import nodemailer from "nodemailer";

function createTransport() {
  // Supports any SMTP provider via env vars:
  //   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
  // If not configured, emails are logged to console (dev mode).
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
  const baseUrl   = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;
  const from      = process.env.SMTP_FROM ?? "Prime Broker <noreply@primebroker.app>";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#050509;color:#fff;padding:32px;border-radius:16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);width:56px;height:56px;border-radius:14px;line-height:56px;font-weight:900;font-size:18px;color:#080c14;">PB</div>
        <h1 style="color:#fff;font-size:22px;margin:12px 0 4px;">Prime Broker</h1>
        <p style="color:#6b7280;font-size:13px;margin:0;">Confirme seu email para começar</p>
      </div>
      <p style="color:#d1d5db;font-size:15px;margin-bottom:8px;">Olá, <strong>${name}</strong>!</p>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin-bottom:28px;">
        Você se cadastrou na Prime Broker. Clique no botão abaixo para confirmar seu email e ativar sua conta demo de <strong style="color:#f59e0b;">$10.000</strong>.
      </p>
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${verifyUrl}"
          style="display:inline-block;background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;">
          ✅ Confirmar Email
        </a>
      </div>
      <p style="color:#6b7280;font-size:11px;text-align:center;">
        Link válido por 24 horas. Se você não se cadastrou, ignore este email.
      </p>
    </div>
  `;

  const transport = createTransport();
  if (!transport) {
    // No SMTP configured — log link for local development
    console.log(`[EMAIL] Verify link for ${to}: ${verifyUrl}`);
    return;
  }
  await transport.sendMail({ from, to, subject: "✅ Confirme seu email — Prime Broker", html });
}
