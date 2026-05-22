import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

// Public endpoint — returns safe affiliate info for display during registration
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!rateLimit(`affinfo:${ip}`, 20, 60_000))
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const affiliate = await prisma.affiliate.findUnique({
    where: { id },
    select: { id: true, name: true, level: true },
  }).catch(() => null);

  if (!affiliate) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({ id: affiliate.id, name: affiliate.name, level: affiliate.level });
}
