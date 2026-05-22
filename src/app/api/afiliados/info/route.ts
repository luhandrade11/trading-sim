import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — returns safe affiliate info for display during registration
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const affiliate = await prisma.affiliate.findUnique({
    where: { id },
    select: { id: true, name: true, level: true },
  }).catch(() => null);

  if (!affiliate) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({ id: affiliate.id, name: affiliate.name, level: affiliate.level });
}
