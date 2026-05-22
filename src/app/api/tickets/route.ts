import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAffiliateSession } from "@/lib/affiliateAuth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

function getIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

// GET: list tickets for the current user or affiliate
export async function GET(req: NextRequest) {
  const session     = await getServerSession(authOptions);
  const affiliateId = await getAffiliateSession();

  if (!session?.user?.id && !affiliateId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const authorType = session?.user?.id ? "user" : "affiliate";
  const authorId   = session?.user?.id ?? affiliateId!;

  const tickets = await prisma.supportTicket.findMany({
    where:   { authorType, authorId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, subject: true, status: true, priority: true, createdAt: true, updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json(tickets);
}

// POST: open new ticket
export async function POST(req: NextRequest) {
  const session     = await getServerSession(authOptions);
  const affiliateId = await getAffiliateSession();

  if (!session?.user?.id && !affiliateId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  if (!rateLimit(`ticket-open:${getIp(req)}`, 5, 3_600_000))
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (!body?.subject || !body?.message)
    return NextResponse.json({ error: "Assunto e mensagem são obrigatórios" }, { status: 400 });

  const { subject, message, priority } = body;
  if (typeof subject !== "string" || subject.trim().length < 5 || subject.length > 200)
    return NextResponse.json({ error: "Assunto deve ter entre 5 e 200 caracteres" }, { status: 400 });
  if (typeof message !== "string" || message.trim().length < 10 || message.length > 5000)
    return NextResponse.json({ error: "Mensagem deve ter entre 10 e 5000 caracteres" }, { status: 400 });

  const validPriorities = ["LOW", "NORMAL", "HIGH", "URGENT"];
  const finalPriority = validPriorities.includes(priority) ? priority : "NORMAL";

  const authorType = session?.user?.id ? "user" : "affiliate";
  const authorId   = session?.user?.id ?? affiliateId!;

  const ticket = await prisma.supportTicket.create({
    data: {
      subject: subject.trim(),
      priority: finalPriority,
      authorType,
      authorId,
      messages: {
        create: {
          authorType,
          authorId,
          body: message.trim(),
        },
      },
    },
    include: { messages: true },
  });

  return NextResponse.json(ticket, { status: 201 });
}
