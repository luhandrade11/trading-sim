import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
  const status = searchParams.get("status") ?? "";
  const take   = 25;
  const skip   = (page - 1) * take;

  const where = status ? { status } : {};

  const [total, tickets] = await Promise.all([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: true } },
      },
    }),
  ]);

  // Enrich with author info
  const userIds  = tickets.filter((t) => t.authorType === "user").map((t) => t.authorId);
  const affIds   = tickets.filter((t) => t.authorType === "affiliate").map((t) => t.authorId);

  const [users, affiliates] = await Promise.all([
    userIds.length  > 0 ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }) : [],
    affIds.length   > 0 ? prisma.affiliate.findMany({ where: { id: { in: affIds } }, select: { id: true, name: true, email: true } }) : [],
  ]);

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const affMap  = Object.fromEntries(affiliates.map((a) => [a.id, a]));

  const enriched = tickets.map((t) => ({
    ...t,
    author: t.authorType === "user" ? userMap[t.authorId] : affMap[t.authorId],
  }));

  return NextResponse.json({ total, page, pages: Math.ceil(total / take), tickets: enriched });
}
