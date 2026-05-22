import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MISSION_DEFS = [
  { type: "trades_5",   target: 5,  label: { "pt-BR": "Faça 5 operações hoje", "en-US": "Make 5 trades today", "es-ES": "Haz 5 operaciones hoy", "fr-FR": "Faites 5 opérations aujourd'hui", "de-DE": "Mache heute 5 Trades", "ja-JP": "今日5回取引する" } },
  { type: "wins_2",     target: 2,  label: { "pt-BR": "Ganhe 2 operações hoje", "en-US": "Win 2 trades today", "es-ES": "Gana 2 operaciones hoy", "fr-FR": "Gagnez 2 opérations aujourd'hui", "de-DE": "Gewinne heute 2 Trades", "ja-JP": "今日2回勝つ" } },
  { type: "amount_50",  target: 50, label: { "pt-BR": "Opere $50 no total hoje", "en-US": "Trade $50 total today", "es-ES": "Opera $50 en total hoy", "fr-FR": "Tradez 50$ au total aujourd'hui", "de-DE": "Handle heute $50 insgesamt", "ja-JP": "今日合計$50取引する" } },
];

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  const today  = new Date().toISOString().slice(0, 10);

  // Get reward setting
  const settingRow = await prisma.adminSettings.findUnique({ where: { key: "missionRewardUsd" } }).catch(() => null);
  const rewardUsd  = settingRow ? Number(settingRow.value) : 10;

  // Start/end of today (UTC)
  const dayStart = new Date(today + "T00:00:00.000Z");
  const dayEnd   = new Date(today + "T23:59:59.999Z");

  // Get today's trades for this user
  const todayTrades = await prisma.trade.findMany({
    where: {
      userId,
      createdAt: { gte: dayStart, lte: dayEnd },
    },
    select: { result: true, amount: true },
  });

  // Compute progress for each mission type
  const progressMap: Record<string, number> = {
    trades_5:  todayTrades.length,
    wins_2:    todayTrades.filter(t => t.result === "WIN").length,
    amount_50: todayTrades.reduce((s, t) => s + t.amount, 0),
  };

  // Upsert missions and return them
  const missions = await Promise.all(
    MISSION_DEFS.map(async (def) => {
      const progress = Math.min(def.target, progressMap[def.type] ?? 0);

      const record = await prisma.dailyMission.upsert({
        where:  { userId_date_type: { userId, date: today, type: def.type } },
        update: { progress, rewardUsd },
        create: { userId, date: today, type: def.type, progress, target: def.target, rewardUsd },
      });

      const url = new URL(req.url);
      const locale = (url.searchParams.get("locale") ?? "pt-BR") as keyof typeof def.label;
      const label  = def.label[locale] ?? def.label["pt-BR"];

      return {
        id:        record.id,
        type:      record.type,
        progress:  record.progress,
        target:    record.target,
        claimed:   record.claimed,
        rewardUsd: record.rewardUsd,
        label,
      };
    })
  );

  return NextResponse.json(missions);
}
