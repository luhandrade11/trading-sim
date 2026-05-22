"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  balance: number; totalEarned: number; activePlayers: number;
  totalClicks: number; totalConversions: number; totalRevenue: number;
  totalTrades: number; todayRevenue: number; monthRevenue: number;
  pendingWithdrawals: number;
  links: { id: string; slug: string; title: string; clicks: number; conversions: number }[];
}
interface Me { id: string; commissionRate: number; level: number; name: string; lastWithdrawalAt?: string | null; }

function fmt(n: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n); }

function StatCard({ label, value, sub, color, glow }: { label: string; value: string; sub?: string; color: string; glow?: string }) {
  return (
    <div className={`relative bg-[#0d1117] border border-white/6 rounded-2xl p-5 overflow-hidden group hover:border-white/10 transition-all duration-300`}>
      {glow && <div className={`absolute -top-6 -right-6 w-20 h-20 ${glow} rounded-full blur-2xl opacity-40 group-hover:opacity-70 transition-opacity`} />}
      <div className="text-[10px] text-slate-600 uppercase tracking-[0.15em] mb-2 font-medium">{label}</div>
      <div className={`text-2xl font-black font-mono ${color} relative`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-600 mt-1">{sub}</div>}
    </div>
  );
}

export default function AfiliadorDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [me, setMe]       = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    Promise.all([
      fetch("/api/afiliados/stats").then((r) => r.json()),
      fetch("/api/afiliados/me").then((r) => r.json()),
    ]).then(([s, m]) => { setStats(s); setMe(m); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }
  if (!stats) return null;

  const ratePercent = me ? Math.round(me.commissionRate * 100) : 90;
  const convRate = stats.totalClicks > 0 ? ((stats.totalConversions / stats.totalClicks) * 100).toFixed(1) : "0";

  // Next withdrawal date
  let nextWithdrawal: Date | null = null;
  if (me?.lastWithdrawalAt) {
    nextWithdrawal = new Date(me.lastWithdrawalAt);
    nextWithdrawal.setDate(nextWithdrawal.getDate() + 7);
  }
  const canWithdraw = !nextWithdrawal || nextWithdrawal <= new Date();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Visão geral</h1>
          <p className="text-slate-500 text-sm mt-0.5">Seus resultados em tempo real</p>
        </div>
        <Link href="/afiliados/dashboard/links"
          className="bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-[#080c14] font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
          + Novo link
        </Link>
      </div>

      {/* Meu Acordo */}
      <div className="relative bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-transparent border border-emerald-500/20 rounded-2xl px-6 py-5 overflow-hidden">
        <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-40 h-40 bg-emerald-400/5 rounded-full blur-3xl" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30 text-lg">
              🤝
            </div>
            <div>
              <div className="text-[10px] text-emerald-400/60 uppercase tracking-[0.2em] font-bold mb-0.5">Meu acordo</div>
              <div className="text-2xl font-black text-white">
                <span className="text-emerald-400">{ratePercent}%</span>{" "}
                <span className="text-lg font-semibold text-slate-300">de revenue share</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Para cada $100 perdidos pelos seus jogadores, você recebe{" "}
                <strong className="text-white">${ratePercent}</strong>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-center px-4 py-2 bg-white/4 rounded-xl border border-white/6">
              <div className="text-lg font-black text-emerald-400">{fmt(stats.todayRevenue)}</div>
              <div className="text-[10px] text-slate-600">hoje</div>
            </div>
            <div className="text-center px-4 py-2 bg-white/4 rounded-xl border border-white/6">
              <div className="text-lg font-black text-violet-400">{fmt(stats.monthRevenue)}</div>
              <div className="text-[10px] text-slate-600">este mês</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Saldo disponível" value={fmt(stats.balance)} sub="pronto para saque" color="text-emerald-400" glow="bg-emerald-400" />
        <StatCard label="Total ganho" value={fmt(stats.totalEarned)} sub="histórico completo" color="text-emerald-400" glow="bg-emerald-400" />
        <StatCard label="Jogadores" value={String(stats.activePlayers)} sub="indicados ativos" color="text-white" />
        <StatCard label="Taxa de conv." value={`${convRate}%`} sub={`${stats.totalConversions} de ${stats.totalClicks} cliques`} color="text-violet-400" />
      </div>

      {/* Links + saque CTA */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Links */}
        <div className="bg-[#0d1117] border border-white/6 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-bold text-white text-sm">Links de divulgação</h2>
            <Link href="/afiliados/dashboard/links" className="text-emerald-400 hover:text-emerald-300 text-xs transition-colors">
              Gerenciar →
            </Link>
          </div>
          {stats.links.length === 0 ? (
            <div className="text-center py-10 text-slate-600 text-sm">
              <div className="text-3xl mb-2">🔗</div>
              <Link href="/afiliados/dashboard/links" className="text-emerald-400 text-xs hover:text-emerald-300">Criar primeiro link →</Link>
            </div>
          ) : (
            <div className="divide-y divide-white/4">
              {stats.links.slice(0, 4).map((link) => (
                <div key={link.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{link.title}</div>
                    <div className="text-[10px] text-slate-600 font-mono truncate">{baseUrl}/ref/{link.slug}</div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-right">
                    <div>
                      <div className="text-sm font-bold text-white">{link.clicks}</div>
                      <div className="text-[9px] text-slate-600">cliques</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-emerald-400">{link.conversions}</div>
                      <div className="text-[9px] text-slate-600">cadastros</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saque CTA */}
        <div className="flex flex-col gap-3">
          {/* Balance card */}
          <div className={`relative border rounded-2xl p-5 overflow-hidden flex-1 ${
            canWithdraw && stats.balance >= 50
              ? "bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20"
              : "bg-[#0d1117] border-white/6"
          }`}>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Saldo para saque</div>
            <div className="text-3xl font-black text-white font-mono mb-1">{fmt(stats.balance)}</div>
            {canWithdraw && stats.balance >= 50 ? (
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-emerald-400">Disponível agora</span>
                <Link href="/afiliados/dashboard/saques"
                  className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all active:scale-95">
                  Sacar via PIX
                </Link>
              </div>
            ) : nextWithdrawal && nextWithdrawal > new Date() ? (
              <div className="text-xs text-slate-500 mt-2">
                Próximo saque disponível em{" "}
                <strong className="text-emerald-400">{nextWithdrawal.toLocaleDateString("pt-BR")}</strong>
              </div>
            ) : (
              <div className="text-xs text-slate-600 mt-2">Mínimo $50 para sacar</div>
            )}
          </div>

          {/* Total earned */}
          <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Ganho total histórico</div>
                <div className="text-xl font-black text-emerald-400 font-mono">{fmt(stats.totalEarned)}</div>
              </div>
              <Link href="/afiliados/dashboard/revenues" className="text-xs text-slate-500 hover:text-emerald-400 transition-colors">
                Ver histórico →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
