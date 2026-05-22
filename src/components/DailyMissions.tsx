"use client";

import { useEffect, useState } from "react";

interface Mission {
  id:        string;
  type:      string;
  progress:  number;
  target:    number;
  claimed:   boolean;
  rewardUsd: number;
  label:     string;
}

interface Props {
  locale:           string;
  onRewardClaimed:  (reward: number) => void;
}

const ICON_MAP: Record<string, string> = {
  trades_5:  "🎯",
  wins_2:    "🏆",
  amount_50: "💰",
};

const UI: Record<string, {
  header: string; claim: string; claimed: string; loading: string; empty: string;
}> = {
  "pt-BR": { header: "Missões de Hoje", claim: "Reivindicar", claimed: "✓ Reivindicado", loading: "Carregando missões…", empty: "Sem missões hoje" },
  "en-US": { header: "Today's Missions", claim: "Claim", claimed: "✓ Claimed", loading: "Loading missions…", empty: "No missions today" },
  "es-ES": { header: "Misiones de Hoy", claim: "Reclamar", claimed: "✓ Reclamado", loading: "Cargando misiones…", empty: "Sin misiones hoy" },
  "fr-FR": { header: "Missions du Jour", claim: "Réclamer", claimed: "✓ Réclamé", loading: "Chargement…", empty: "Aucune mission aujourd'hui" },
  "de-DE": { header: "Heutige Missionen", claim: "Beanspruchen", claimed: "✓ Beansprucht", loading: "Laden…", empty: "Keine Missionen heute" },
  "ja-JP": { header: "今日のミッション", claim: "受け取る", claimed: "✓ 受け取り済み", loading: "読み込み中…", empty: "今日のミッションはありません" },
};

export default function DailyMissions({ locale, onRewardClaimed }: Props) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const ui = UI[locale] ?? UI["pt-BR"];

  useEffect(() => {
    fetch(`/api/missions?locale=${encodeURIComponent(locale)}`)
      .then(r => r.json())
      .then(data => setMissions(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [locale]);

  async function claim(mission: Mission) {
    if (claiming || mission.claimed || mission.progress < mission.target) return;
    setClaiming(mission.id);
    try {
      const res  = await fetch("/api/missions/claim", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ missionId: mission.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setMissions(prev => prev.map(m => m.id === mission.id ? { ...m, claimed: true } : m));
        onRewardClaimed(data.reward);
      }
    } catch {}
    finally { setClaiming(null); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-white/10 border-t-amber-400/60 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">📅</span>
        <span className="text-sm font-bold text-white">{ui.header}</span>
      </div>

      {missions.length === 0 ? (
        <p className="text-white/30 text-xs text-center py-8">{ui.empty}</p>
      ) : (
        <div className="space-y-3">
          {missions.map(mission => {
            const pct      = Math.min(100, Math.round((mission.progress / mission.target) * 100));
            const complete = mission.progress >= mission.target;
            const icon     = ICON_MAP[mission.type] ?? "⭐";

            return (
              <div key={mission.id}
                className={`p-4 rounded-xl border transition-all ${
                  complete && !mission.claimed
                    ? "bg-amber-400/5 border-amber-400/20"
                    : mission.claimed
                    ? "bg-white/2 border-white/5 opacity-60"
                    : "bg-white/3 border-white/8"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-white/80 leading-snug">{mission.label}</span>
                      <span className="text-[9px] font-bold text-amber-400 shrink-0">+${mission.rewardUsd}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${complete ? "bg-amber-400" : "bg-violet-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-white/30 font-mono">
                        {mission.progress}/{mission.target}
                      </span>
                      {mission.claimed ? (
                        <span className="text-[9px] text-emerald-400 font-bold">{ui.claimed}</span>
                      ) : complete ? (
                        <button
                          onClick={() => claim(mission)}
                          disabled={!!claiming}
                          className="px-3 py-1 bg-amber-400/15 border border-amber-400/30 text-amber-400 text-[10px] font-bold rounded-lg hover:bg-amber-400/25 transition-all disabled:opacity-50"
                        >
                          {claiming === mission.id ? "…" : ui.claim}
                        </button>
                      ) : (
                        <span className="text-[9px] text-white/20">{pct}%</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
