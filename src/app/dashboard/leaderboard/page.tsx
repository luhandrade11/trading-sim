"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface LeaderRow {
  rank:         number;
  id:           string;
  display_name: string;
  wins:         number;
  total_trades: number;
  win_rate:     number;
  pnl:          number;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return (
    <span className="w-6 text-center text-xs text-white/30 font-mono tabular-nums">
      {rank}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const letter = name?.[0]?.toUpperCase() ?? "T";
  const colors = ["#6366f1","#8b5cf6","#ec4899","#14b8a6","#f59e0b","#3b82f6"];
  const idx    = name.charCodeAt(0) % colors.length;
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ background: colors[idx] }}
    >
      {letter}
    </div>
  );
}

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [rows, setRows]   = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => { setRows(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#050509] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
        <Link
          href="/dashboard"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-sm font-semibold text-white">Ranking de Traders</h1>
          <p className="text-[10px] text-white/30 mt-0.5">Top 20 melhores traders da plataforma</p>
        </div>
        <div className="ml-auto">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-white transition-colors"
          >
            + Depositar
          </Link>
        </div>
      </div>

      {/* Podium top-3 */}
      {!loading && rows.length >= 3 && (
        <div className="flex items-end justify-center gap-4 px-5 py-6">
          {/* 2nd */}
          <div className="flex flex-col items-center gap-2">
            <Avatar name={rows[1].display_name} />
            <span className="text-[11px] text-white/60">{rows[1].display_name}</span>
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-t-lg flex flex-col items-center justify-center">
              <span className="text-base">🥈</span>
              <span className="text-[10px] text-emerald-400 font-mono">+${rows[1].pnl.toFixed(0)}</span>
            </div>
          </div>
          {/* 1st */}
          <div className="flex flex-col items-center gap-2">
            <Avatar name={rows[0].display_name} />
            <span className="text-[11px] text-white/60">{rows[0].display_name}</span>
            <div className="w-16 h-24 bg-white/5 border border-amber-400/20 rounded-t-lg flex flex-col items-center justify-center">
              <span className="text-xl">🥇</span>
              <span className="text-[10px] text-emerald-400 font-mono">+${rows[0].pnl.toFixed(0)}</span>
            </div>
          </div>
          {/* 3rd */}
          <div className="flex flex-col items-center gap-2">
            <Avatar name={rows[2].display_name} />
            <span className="text-[11px] text-white/60">{rows[2].display_name}</span>
            <div className="w-16 h-12 bg-white/5 border border-white/10 rounded-t-lg flex flex-col items-center justify-center">
              <span className="text-base">🥉</span>
              <span className="text-[10px] text-emerald-400 font-mono">+${rows[2].pnl.toFixed(0)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 px-4 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-white/20 text-sm">
            Carregando...
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <span className="text-3xl">🏆</span>
            <p className="text-white/30 text-sm text-center">
              Ainda não há traders suficientes.<br />Seja o primeiro a aparecer aqui!
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-[40px_1fr_60px_60px_72px] gap-2 px-4 py-2 bg-white/[0.02] text-[10px] text-white/30 uppercase tracking-wider">
              <span>#</span>
              <span>Trader</span>
              <span className="text-center">Win%</span>
              <span className="text-center">Trades</span>
              <span className="text-right">P&L</span>
            </div>

            {rows.map((row, i) => {
              const isCurrentUser = session?.user?.id === row.id;
              return (
                <div
                  key={row.id}
                  className={`grid grid-cols-[40px_1fr_60px_60px_72px] gap-2 px-4 py-3 border-t border-white/5 transition-colors ${
                    isCurrentUser
                      ? "bg-emerald-500/5 border-l-2 border-l-emerald-500"
                      : i % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"
                  }`}
                >
                  {/* Rank */}
                  <div className="flex items-center justify-center">
                    <RankBadge rank={row.rank} />
                  </div>

                  {/* Name */}
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={row.display_name} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {row.display_name}
                        {isCurrentUser && (
                          <span className="ml-1 text-[9px] text-emerald-400 font-normal">(você)</span>
                        )}
                      </p>
                      <div className="w-full bg-white/10 rounded-full h-1 mt-1">
                        <div
                          className="h-1 rounded-full bg-emerald-500"
                          style={{ width: `${row.win_rate}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Win rate */}
                  <div className="flex items-center justify-center">
                    <span className={`text-xs font-mono font-semibold ${
                      row.win_rate >= 60 ? "text-emerald-400" :
                      row.win_rate >= 45 ? "text-white/60" : "text-red-400"
                    }`}>
                      {row.win_rate}%
                    </span>
                  </div>

                  {/* Trades */}
                  <div className="flex items-center justify-center">
                    <span className="text-xs font-mono text-white/40">{row.total_trades}</span>
                  </div>

                  {/* PnL */}
                  <div className="flex items-center justify-end">
                    <span className={`text-xs font-mono font-semibold ${
                      row.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {row.pnl >= 0 ? "+" : ""}${Math.abs(row.pnl).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Conversion CTA */}
        <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-4">
          <div className="text-3xl">💎</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Quer aparecer no ranking?</p>
            <p className="text-[11px] text-white/40 mt-0.5">
              Traders com conta real acumulam P&L real. Deposite e comece agora.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-white transition-colors shrink-0"
            onClick={() => {
              // trigger deposit modal via URL param
            }}
          >
            Depositar
          </Link>
        </div>
      </div>
    </div>
  );
}
