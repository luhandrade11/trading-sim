import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { sendTicketReplyEmail } from "@/lib/email";
import { writeAuditLog } from "@/lib/auditLog";

type Ctx = { params: Promise<{ id: string }> };

// GET: full ticket + messages
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!ticket) return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 });
  return NextResponse.json(ticket);
}

// PATCH: update status or add admin reply
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: { messages: false },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (body.status) {
    const valid = ["OPEN", "IN_PROGRESS", "CLOSED"];
    if (!valid.includes(body.status))
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    updates.status = body.status;
  }

  if (body.priority) {
    const valid = ["LOW", "NORMAL", "HIGH", "URGENT"];
    if (!valid.includes(body.priority))
      return NextResponse.json({ error: "Prioridade inválida" }, { status: 400 });
    updates.priority = body.priority;
  }

  // Add admin reply
  if (body.message && typeof body.message === "string" && body.message.trim().length >= 2) {
    await prisma.ticketMessage.create({
      data: { ticketId: id, authorType: "admin", authorId: "admin", body: body.message.trim() },
    });

    // Notify ticket owner via email
    const authorEmail = ticket.authorType === "user"
      ? await prisma.user.findUnique({ where: { id: ticket.authorId }, select: { email: true, name: true } })
      : await prisma.affiliate.findUnique({ where: { id: ticket.authorId }, select: { email: true, name: true } });

    if (authorEmail) {
      sendTicketReplyEmail(authorEmail.email, authorEmail.name, ticket.subject, body.message.trim(), id);
    }

    writeAuditLog("admin", "admin", "ticket_reply", id, { preview: body.message.slice(0, 100) });
  }

  const updated = await prisma.supportTicket.update({ where: { id }, data: updates });
  return NextResponse.json(updated);
}
