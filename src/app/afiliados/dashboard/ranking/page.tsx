"use client";

import { useEffect, useState } from "react";

interface RankEntry {
  rank: number;
  id: string;
  name: string;
  level: number;
  totalEarned: number;
  earned30?: number;
  isMe: boolean;
}

interface RankingData {
  allTime:      RankEntry[];
  last30:       RankEntry[];
  myAllTimeRank: number | null;
  myLast30Rank:  number | null;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const MEDALS = ["🥇", "🥈", "🥉"];

function RankRow({ entry, valueKey }: { entry: RankEntry; valueKey: "totalEarned" | "earned30" }) {
  return (
    <div className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${entry.isMe ? "bg-emerald-500/5 border-l-2 border-emerald-500" : "hover:bg-white/1"}`}>
      <div className="w-8 text-center flex-shrink-0">
        {entry.rank <= 3
          ? <span className="text-xl">{MEDALS[entry.rank - 1]}</span>
          : <span className="text-slate-500 font-bold text-sm">{entry.rank}</span>
        }
      </div>
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-emerald-400">{entry.name[0]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-semibold text-sm ${entry.isMe ? "text-emerald-300" : "text-white"}`}>
            {entry.isMe ? `${entry.name} (você)` : entry.name}
          </span>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-semibold">
            N{entry.level}
          </span>
        </div>
      </div>
      <div className={`font-black font-mono text-base ${entry.rank === 1 ? "text-yellow-400" : entry.isMe ? "text-emerald-400" : "text-white"}`}>
        {fmt((entry[valueKey] as number) ?? 0)}
      </div>
    </div>
  );
}

export default function RankingPage() {
  const [data, setData]     = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState<"all" | "30">("30");

  useEffect(() => {
    fetch("/api/afiliados/ranking")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
    </div>
  );

  if (!data) return null;

  const entries  = tab === "all" ? data.allTime : data.last30;
  const myRank   = tab === "all" ? data.myAllTimeRank : data.myLast30Rank;
  const valueKey = tab === "all" ? "totalEarned" as const : "earned30" as const;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Ranking</h1>
        <p className="text-slate-500 text-sm mt-0.5">Top afiliados por comissões geradas</p>
      </div>

      {/* My rank badge */}
      {myRank && (
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-emerald-500 uppercase tracking-widest font-semibold mb-1">Sua posição</div>
            <div className="text-4xl font-black text-white"># {myRank}</div>
          </div>
          <div className="text-6xl opacity-20">{myRank <= 3 ? MEDALS[myRank - 1] : "🏅"}</div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-2">
        {(["30", "all"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              tab === t
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-transparent text-slate-500 border-[#1e2a42] hover:text-slate-300"
            }`}
          >
            {t === "30" ? "Últimos 30 dias" : "All-time"}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="bg-[#0d1117] border border-[#1e2a42] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e2a42] flex items-center justify-between">
          <h2 className="font-bold text-white text-sm">Top 20 Afiliados</h2>
          <span className="text-xs text-slate-600">{entries.length} no ranking</span>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-16 text-slate-600 text-sm">Nenhum dado disponível ainda.</div>
        ) : (
          <div className="divide-y divide-[#1e2a42]">
            {entries.map((e) => (
              <RankRow key={e.id} entry={e} valueKey={valueKey} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
