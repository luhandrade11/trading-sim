import { prisma } from "@/lib/prisma";

export async function writeAuditLog(
  actor: string,
  actorType: "admin" | "affiliate" | "user",
  action: string,
  target?: string,
  meta?: Record<string, unknown>,
  ip?: string
) {
  await prisma.auditLog.create({
    data: {
      actor,
      actorType,
      action,
      target: target ?? null,
      meta: meta ? JSON.stringify(meta) : null,
      ip: ip ?? null,
    },
  }).catch(() => {}); // Fire-and-forget — never block the main flow
}
