import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page      = Math.max(1, Number(searchParams.get("page") ?? 1));
  const actorType = searchParams.get("actorType") ?? "";
  const action    = searchParams.get("action") ?? "";
  const take      = 50;
  const skip      = (page - 1) * take;

  const where: Record<string, unknown> = {};
  if (actorType) where.actorType = actorType;
  if (action)    where.action    = { contains: action, mode: "insensitive" };

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
  ]);

  return NextResponse.json({ total, page, pages: Math.ceil(total / take), logs });
}
