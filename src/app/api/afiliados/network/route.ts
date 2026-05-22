import { NextResponse } from "next/server";
import { getAffiliateSession } from "@/lib/affiliateAuth";
import { prisma } from "@/lib/prisma";

type AffNode = {
  id: string;
  name: string;
  email: string;
  level: number;
  commissionRate: number;
  balance: number;
  totalEarned: number;
  createdAt: Date;
  players: number;
  subAffiliates: AffNode[];
};

async function buildTree(affiliateId: string, currentLevel: number, maxLevel: number): Promise<AffNode[]> {
  if (currentLevel > maxLevel) return [];

  const subs = await prisma.affiliate.findMany({
    where: { parentAffiliateId: affiliateId },
    select: { id: true, name: true, email: true, level: true, commissionRate: true, balance: true, totalEarned: true, createdAt: true },
  });

  const results: AffNode[] = [];
  for (const sub of subs) {
    const [players, children] = await Promise.all([
      prisma.user.count({ where: { affiliateId: sub.id } }),
      buildTree(sub.id, currentLevel + 1, maxLevel),
    ]);
    results.push({ ...sub, players, subAffiliates: children });
  }
  return results;
}

export async function GET() {
  const affiliateId = await getAffiliateSession();
  if (!affiliateId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const me = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
    select: { level: true },
  });
  if (!me) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const maxLevel = 4;
  const tree = await buildTree(affiliateId, me.level + 1, maxLevel);

  const totalSubAffiliates = countAll(tree);

  return NextResponse.json({ tree, totalSubAffiliates, myLevel: me.level, maxLevel });
}

function countAll(nodes: AffNode[]): number {
  return nodes.reduce((acc, n) => acc + 1 + countAll(n.subAffiliates), 0);
}
