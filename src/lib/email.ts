// Email delivery priority:
//   1. Resend  — RESEND_API_KEY env var
//   2. SMTP    — SMTP_HOST + SMTP_USER + SMTP_PASS env vars
//   3. Console — development fallback (logs link, no actual send)

const FROM_DEFAULT = "Prime Broker <onboarding@resend.dev>";

function logo() {
  return `<div style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);width:48px;height:48px;border-radius:12px;line-height:48px;font-weight:900;font-size:16px;color:#080c14;text-align:center;">PB</div>`;
}

function wrapper(body: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#050509;color:#fff;padding:32px;border-radius:16px;">
    <div style="text-align:center;margin-bottom:24px;">${logo()}<h1 style="color:#fff;font-size:20px;margin:10px 0 2px;">Prime Broker</h1></div>
    ${body}
    <p style="color:#374151;font-size:11px;text-align:center;margin-top:24px;">
      Se você não reconhece esta ação, ignore este email.
    </p>
  </div>`;
}

function buildVerifyHtml(name: string, verifyUrl: string): string {
  return wrapper(`
    <p style="color:#d1d5db;font-size:15px;margin-bottom:8px;">Olá, <strong>${name}</strong>!</p>
    <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin-bottom:28px;">
      Você se cadastrou na Prime Broker. Clique no botão abaixo para confirmar seu email e ativar sua conta demo de <strong style="color:#f59e0b;">$5.000</strong>.
    </p>
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;">✅ Confirmar Email</a>
    </div>
    <p style="color:#4b5563;font-size:11px;text-align:center;word-break:break-all;">Ou acesse: <a href="${verifyUrl}" style="color:#6b7280;">${verifyUrl}</a></p>
    <p style="color:#374151;font-size:11px;text-align:center;margin-top:16px;">Link válido por 24 horas.</p>
  `);
}

function buildAffiliateApprovedHtml(name: string, loginUrl: string): string {
  return wrapper(`
    <p style="color:#d1d5db;font-size:15px;margin-bottom:8px;">Olá, <strong>${name}</strong>!</p>
    <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin-bottom:24px;">
      Sua conta de afiliado foi <strong style="color:#10b981;">aprovada</strong>! Você já pode acessar o painel e começar a divulgar seus links.
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;">Acessar Painel</a>
    </div>
  `);
}

function buildAffiliateRejectedHtml(name: string): string {
  return wrapper(`
    <p style="color:#d1d5db;font-size:15px;margin-bottom:8px;">Olá, <strong>${name}</strong>!</p>
    <p style="color:#9ca3af;font-size:14px;line-height:1.6;">
      Infelizmente sua solicitação de afiliado foi <strong style="color:#f87171;">recusada</strong>.
      Se acredita que houve um engano, entre em contato com o suporte.
    </p>
  `);
}

function buildNewSubAffiliateHtml(name: string, subName: string, dashUrl: string): string {
  return wrapper(`
    <p style="color:#d1d5db;font-size:15px;margin-bottom:8px;">Olá, <strong>${name}</strong>!</p>
    <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin-bottom:24px;">
      Você tem um novo sub-afiliado aguardando aprovação: <strong style="color:#a78bfa;">${subName}</strong>.
      Acesse o painel para aprovar ou recusar.
    </p>
    <div style="text-align:center;">
      <a href="${dashUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;">Ver Aprovações</a>
    </div>
  `);
}

function buildWithdrawalApprovedHtml(name: string, amount: string): string {
  return wrapper(`
    <p style="color:#d1d5db;font-size:15px;margin-bottom:8px;">Olá, <strong>${name}</strong>!</p>
    <p style="color:#9ca3af;font-size:14px;line-height:1.6;">
      Seu saque de <strong style="color:#10b981;">${amount}</strong> foi <strong style="color:#10b981;">aprovado</strong> e será processado via PIX em até 24 horas úteis.
    </p>
  `);
}

function buildWithdrawalRejectedHtml(name: string, amount: string): string {
  return wrapper(`
    <p style="color:#d1d5db;font-size:15px;margin-bottom:8px;">Olá, <strong>${name}</strong>!</p>
    <p style="color:#9ca3af;font-size:14px;line-height:1.6;">
      Seu saque de <strong style="color:#f87171;">${amount}</strong> foi <strong style="color:#f87171;">recusado</strong>.
      O valor foi devolvido ao seu saldo. Entre em contato com o suporte para mais informações.
    </p>
  `);
}

function buildTicketReplyHtml(name: string, subject: string, message: string, ticketUrl: string): string {
  return wrapper(`
    <p style="color:#d1d5db;font-size:15px;margin-bottom:8px;">Olá, <strong>${name}</strong>!</p>
    <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin-bottom:16px;">
      Seu ticket <strong style="color:#a78bfa;">"${subject}"</strong> recebeu uma resposta:
    </p>
    <div style="background:#0d0a1a;border:1px solid #1e1532;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="color:#d1d5db;font-size:14px;line-height:1.6;margin:0;">${message}</p>
    </div>
    <div style="text-align:center;">
      <a href="${ticketUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;">Ver Ticket</a>
    </div>
  `);
}

async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from   = process.env.EMAIL_FROM ?? FROM_DEFAULT;
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

async function sendViaSMTP(to: string, subject: string, html: string): Promise<void> {
  const nodemailer = await import("nodemailer");
  const transport  = nodemailer.default.createTransport({
    host:   process.env.SMTP_HOST!,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const from = process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? FROM_DEFAULT;
  const info = await transport.sendMail({ from, to, subject, html });
  const previewUrl = nodemailer.default.getTestMessageUrl(info);
  if (previewUrl) console.log(`[EMAIL] Preview: ${previewUrl}`);
}

async function send(to: string, subject: string, html: string): Promise<void> {
  if (process.env.RESEND_API_KEY) { await sendViaResend(to, subject, html); return; }
  if (process.env.SMTP_HOST)      { await sendViaSMTP(to, subject, html);   return; }
  console.log(`[EMAIL] No provider. Subject: "${subject}" → ${to}`);
}

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
  const baseUrl   = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;
  await send(to, "✅ Confirme seu email — Prime Broker", buildVerifyHtml(name, verifyUrl));
}

export async function sendAffiliateApprovedEmail(to: string, name: string): Promise<void> {
  const loginUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/afiliados/login`;
  await send(to, "✅ Conta de afiliado aprovada — Prime Broker", buildAffiliateApprovedHtml(name, loginUrl)).catch(() => {});
}

export async function sendAffiliateRejectedEmail(to: string, name: string): Promise<void> {
  await send(to, "Atualização da sua conta de afiliado — Prime Broker", buildAffiliateRejectedHtml(name)).catch(() => {});
}

export async function sendNewSubAffiliateEmail(to: string, name: string, subName: string): Promise<void> {
  const dashUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/afiliados/dashboard/rede`;
  await send(to, `Novo sub-afiliado aguardando aprovação — ${subName}`, buildNewSubAffiliateHtml(name, subName, dashUrl)).catch(() => {});
}

export async function sendWithdrawalApprovedEmail(to: string, name: string, amount: number): Promise<void> {
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  await send(to, `✅ Saque de ${fmt} aprovado — Prime Broker`, buildWithdrawalApprovedHtml(name, fmt)).catch(() => {});
}

export async function sendWithdrawalRejectedEmail(to: string, name: string, amount: number): Promise<void> {
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  await send(to, `Saque de ${fmt} recusado — Prime Broker`, buildWithdrawalRejectedHtml(name, fmt)).catch(() => {});
}

export async function sendTicketReplyEmail(to: string, name: string, subject: string, message: string, ticketId: string): Promise<void> {
  const ticketUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/suporte/${ticketId}`;
  await send(to, `Resposta ao ticket: ${subject}`, buildTicketReplyHtml(name, subject, message, ticketUrl)).catch(() => {});
}
