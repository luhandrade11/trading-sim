"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  totalRevenue: number;
  revenueToday: number;
  revenueWeek: number;
  platformPnl: number;
  realWinRate: number;
  realTradesCount: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsAmount: number;
  affiliateCommissions: number;
  activeUsers: number;
  recentPendingWithdrawals: Array<{
    id: string; amount: number; method: string; details: string; createdAt: string;
    user: { id: string; name: string; email: string };
  }>;
}

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatCard({ label, value, sub, color = "white" }: {
  label: string; value: string; sub?: string; color?: "white" | "green" | "red" | "amber";
}) {
  const colors = {
    white: "text-white",
    green: "text-emerald-400",
    red:   "text-rose-400",
    amber: "text-amber-400",
  };
  return (
    <div className="bg-[#0d1117] border border-[#1e2a42] rounded-2xl p-5">
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-2xl font-black font-mono ${colors[color]}`}>{value}</p>
      {sub && <p className="text-slate-600 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    const res = await fetch("/api/admin/stats");
    if (res.ok) setStats(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 30_000);
    return () => clearInterval(id);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-white/20 border-t-amber-400/60 rounded-full animate-spin" />
    </div>
  );

  if (!stats) return (
    <div className="p-8 text-rose-400">Erro ao carregar estatísticas.</div>
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Visão geral em tempo real · atualiza a cada 30s</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-xs font-semibold">{stats.activeUsers} usuários ativos</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Usuários Total"   value={stats.totalUsers.toLocaleString()}    sub={`+${stats.newUsersToday} hoje · +${stats.newUsersWeek} esta semana`} />
        <StatCard label="Faturamento Total" value={fmt(stats.totalRevenue)}             sub={`Hoje: ${fmt(stats.revenueToday)}`} color="amber" />
        <StatCard label="Faturamento Semana" value={fmt(stats.revenueWeek)}             sub="Últimos 7 dias" color="amber" />
        <StatCard label="Lucro da Casa (Trades)" value={fmt(stats.platformPnl)}        color={stats.platformPnl >= 0 ? "green" : "red"}
          sub={`${stats.realTradesCount} trades reais`} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Win Rate Real"       value={`${stats.realWinRate.toFixed(1)}%`}
          color={stats.realWinRate < 45 ? "green" : "red"}
          sub={stats.realWinRate < 45 ? "Casa ganhando" : "Jogadores ganhando"} />
        <StatCard label="Saques Pendentes"    value={stats.pendingWithdrawalsCount.toString()}
          color={stats.pendingWithdrawalsCount > 0 ? "amber" : "white"}
          sub={fmt(stats.pendingWithdrawalsAmount)} />
        <StatCard label="Comissões Afiliados" value={fmt(stats.affiliateCommissions)} />
        <StatCard label="Usuários Ativos"     value={stats.activeUsers.toString()} sub="Trades nos últimos 15min" color="green" />
      </div>

      {/* Pending withdrawals preview */}
      {stats.recentPendingWithdrawals.length > 0 && (
        <div className="bg-[#0d1117] border border-amber-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold">Saques Pendentes</h2>
            <Link href="/admin/withdrawals" className="text-amber-400 text-sm hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentPendingWithdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between py-2 border-b border-[#1e2a42] last:border-0">
                <div>
                  <p className="text-white text-sm font-semibold">{w.user.name}</p>
                  <p className="text-slate-500 text-xs">{w.user.email} · {w.method}</p>
                </div>
                <div className="text-right">
                  <p className="text-amber-400 font-bold">{fmt(w.amount)}</p>
                  <p className="text-slate-600 text-xs">{new Date(w.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { href: "/admin/users",       label: "Gerenciar Usuários",  desc: "Win rate, saldo, bloqueio",     icon: "👥" },
          { href: "/admin/withdrawals", label: "Aprovar Saques",      desc: "Pendências aguardando ação",    icon: "💸" },
          { href: "/admin/settings",    label: "Configurações",       desc: "Win rate global, gateway PIX",  icon: "⚙️"  },
        ].map((c) => (
          <Link key={c.href} href={c.href}
            className="bg-[#0d1117] border border-[#1e2a42] hover:border-amber-500/30 rounded-2xl p-5 transition-all group">
            <p className="text-2xl mb-3">{c.icon}</p>
            <p className="text-white font-semibold text-sm group-hover:text-amber-400 transition-colors">{c.label}</p>
            <p className="text-slate-500 text-xs mt-1">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
