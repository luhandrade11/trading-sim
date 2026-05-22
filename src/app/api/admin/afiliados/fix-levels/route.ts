import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

// Recalculates the `level` field for all affiliates from the parentAffiliateId chain
export async function POST() {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  // Fetch all affiliates
  const all = await prisma.affiliate.findMany({
    select: { id: true, parentAffiliateId: true, level: true },
  });

  // Build parent map
  const parentMap = new Map<string, string | null>(all.map((a) => [a.id, a.parentAffiliateId]));

  // Calculate correct level for each affiliate by walking up the chain
  function calcLevel(id: string, visited = new Set<string>()): number {
    if (visited.has(id)) return 1; // circular ref guard
    visited.add(id);
    const parentId = parentMap.get(id);
    if (!parentId) return 1;
    return calcLevel(parentId, visited) + 1;
  }

  let fixed = 0;
  const updates: Promise<unknown>[] = [];

  for (const aff of all) {
    const correct = calcLevel(aff.id);
    if (aff.level !== correct) {
      updates.push(
        prisma.affiliate.update({ where: { id: aff.id }, data: { level: correct } })
      );
      fixed++;
    }
  }

  await Promise.all(updates);

  return NextResponse.json({ ok: true, total: all.length, fixed });
}
