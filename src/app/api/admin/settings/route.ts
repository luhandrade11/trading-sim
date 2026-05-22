import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

const VALID_KEYS = ["globalDemoRate", "globalRealRate", "pixGateway", "maintenanceMode"];

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const rows = await prisma.adminSettings.findMany();
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;

  // Defaults
  if (!settings.globalDemoRate)    settings.globalDemoRate    = "60";
  if (!settings.globalRealRate)    settings.globalRealRate    = "35";
  if (!settings.pixGateway)        settings.pixGateway        = "abacatepay";
  if (!settings.maintenanceMode)   settings.maintenanceMode   = "false";

  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const updates: Array<{ key: string; value: string }> = [];

  for (const key of VALID_KEYS) {
    if (key in body) {
      const val = String(body[key]);
      if (key === "globalDemoRate" || key === "globalRealRate") {
        const n = Number(val);
        if (isNaN(n) || n < 0 || n > 100)
          return NextResponse.json({ error: `${key} deve ser 0-100` }, { status: 400 });
      }
      updates.push({ key, value: val });
    }
  }

  await Promise.all(
    updates.map((u) =>
      prisma.adminSettings.upsert({
        where:  { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
