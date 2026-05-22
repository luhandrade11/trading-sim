import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAffiliateSession } from "@/lib/affiliateAuth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

type Ctx = { params: Promise<{ id: string }> };

// GET: get ticket with messages
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const session     = await getServerSession(authOptions);
  const affiliateId = await getAffiliateSession();

  if (!session?.user?.id && !affiliateId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const authorType = session?.user?.id ? "user" : "affiliate";
  const authorId   = session?.user?.id ?? affiliateId!;

  const ticket = await prisma.supportTicket.findFirst({
    where: { id, authorType, authorId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!ticket) return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 });
  return NextResponse.json(ticket);
}

// POST: add reply message
export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const session     = await getServerSession(authOptions);
  const affiliateId = await getAffiliateSession();

  if (!session?.user?.id && !affiliateId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const authorType = session?.user?.id ? "user" : "affiliate";
  const authorId   = session?.user?.id ?? affiliateId!;

  if (!rateLimit(`ticket-reply:${authorId}`, 10, 60_000))
    return NextResponse.json({ error: "Muitas mensagens" }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (!body?.message || typeof body.message !== "string" || body.message.trim().length < 2)
    return NextResponse.json({ error: "Mensagem inválida" }, { status: 400 });

  const ticket = await prisma.supportTicket.findFirst({
    where: { id, authorType, authorId },
  });

  if (!ticket) return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 });
  if (ticket.status === "CLOSED")
    return NextResponse.json({ error: "Ticket fechado" }, { status: 400 });

  const message = await prisma.ticketMessage.create({
    data: { ticketId: id, authorType, authorId, body: body.message.trim() },
  });

  await prisma.supportTicket.update({ where: { id }, data: { updatedAt: new Date() } });

  return NextResponse.json(message, { status: 201 });
}
