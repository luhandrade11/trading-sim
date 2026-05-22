import { NextRequest, NextResponse } from "next/server";
import { getAffiliateSession } from "@/lib/affiliateAuth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function GET() {
  const affiliateId = await getAffiliateSession();
  if (!affiliateId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const links = await prisma.affiliateLink.findMany({
    where: { affiliateId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(links);
}

export async function POST(req: NextRequest) {
  const affiliateId = await getAffiliateSession();
  if (!affiliateId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });

  const count = await prisma.affiliateLink.count({ where: { affiliateId } });
  if (count >= 20) return NextResponse.json({ error: "Limite de 20 links atingido" }, { status: 400 });

  const slug = nanoid(8);
  const link = await prisma.affiliateLink.create({
    data: { affiliateId, slug, title },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return NextResponse.json({ ...link, url: `${baseUrl}/ref/${link.slug}` });
}
