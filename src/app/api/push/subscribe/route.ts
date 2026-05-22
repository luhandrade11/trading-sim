import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.endpoint || !body?.p256dh || !body?.auth) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where:  { endpoint: body.endpoint },
    update: { p256dh: body.p256dh, auth: body.auth, userId: session.user.id },
    create: { userId: session.user.id, endpoint: body.endpoint, p256dh: body.p256dh, auth: body.auth },
  });

  return NextResponse.json({ ok: true });
}
