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

function StatCard({ label, value, sub, color = "white", icon }: {
  label: string; value: string; sub?: string;
  color?: "white" | "green" | "red" | "violet";
  icon: React.ReactNode;
}) {
  const colors = { white: "text-white", green: "text-emerald-400", red: "text-rose-400", violet: "text-violet-400" };
  const bgColors = { white: "bg-white/5", green: "bg-emerald-500/10", red: "bg-rose-500/10", violet: "bg-violet-500/10" };
  return (
    <div className="bg-[#0d0a1a] border border-white/6 rounded-2xl p-5 hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest leading-tight">{label}</p>
        <div className={`w-8 h-8 ${bgColors[color]} rounded-xl flex items-center justify-center ${colors[color]} flex-shrink-0`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-black font-mono ${colors[color]}`}>{value}</p>
      {sub && <p className="text-slate-600 text-[11px] mt-1.5">{sub}</p>}
    </div>
  );
}

const IcoUsers    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>;
const IcoRevenue  = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
const IcoChart    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>;
const IcoPnl      = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>;
const IcoWinRate  = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>;
const IcoWithdraw = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>;
const IcoAffil    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>;
const IcoActive   = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M9 10a3 3 0 110 4 3 3 0 010-4z"/></svg>;

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
      <div className="w-5 h-5 border-2 border-white/10 border-t-violet-400/60 rounded-full animate-spin" />
    </div>
  );

  if (!stats) return (
    <div className="p-8 text-rose-400 text-sm">Erro ao carregar estatísticas.</div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-600 text-xs mt-0.5">Visão geral da plataforma · atualiza a cada 30s</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/8 border border-emerald-500/15 rounded-xl">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-xs font-semibold">{stats.activeUsers} ativos agora</span>
        </div>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Usuários Total"     value={stats.totalUsers.toLocaleString()}
          sub={`+${stats.newUsersToday} hoje · +${stats.newUsersWeek} semana`}
          icon={<IcoUsers />} />
        <StatCard label="Faturamento Total"  value={fmt(stats.totalRevenue)}
          sub={`Hoje: ${fmt(stats.revenueToday)}`}
          color="violet" icon={<IcoRevenue />} />
        <StatCard label="Faturamento Semana" value={fmt(stats.revenueWeek)}
          sub="Últimos 7 dias"
          color="violet" icon={<IcoChart />} />
        <StatCard label="P&L da Casa"        value={fmt(stats.platformPnl)}
          color={stats.platformPnl >= 0 ? "green" : "red"}
          sub={`${stats.realTradesCount} trades reais`}
          icon={<IcoPnl />} />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Win Rate Real"      value={`${stats.realWinRate.toFixed(1)}%`}
          color={stats.realWinRate < 45 ? "green" : "red"}
          sub={stats.realWinRate < 45 ? "Casa ganhando" : "Jogadores ganhando"}
          icon={<IcoWinRate />} />
        <StatCard label="Saques Pendentes"   value={stats.pendingWithdrawalsCount.toString()}
          color={stats.pendingWithdrawalsCount > 0 ? "violet" : "white"}
          sub={fmt(stats.pendingWithdrawalsAmount)}
          icon={<IcoWithdraw />} />
        <StatCard label="Comissões Afiliados" value={fmt(stats.affiliateCommissions)}
          icon={<IcoAffil />} />
        <StatCard label="Usuários Ativos"    value={stats.activeUsers.toString()}
          sub="Trades nos últimos 15min"
          color="green" icon={<IcoActive />} />
      </div>

      {/* Pending withdrawals */}
      {stats.recentPendingWithdrawals.length > 0 && (
        <div className="bg-[#0d0a1a] border border-violet-500/15 rounded-2xl overflow-hidden mb-6">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <h2 className="text-white font-bold text-sm">Saques Pendentes</h2>
            </div>
            <Link href="/admin/withdrawals"
              className="text-violet-400 text-xs font-semibold hover:text-violet-300 transition-colors flex items-center gap-1">
              Ver todos
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
            </Link>
          </div>
          <div className="divide-y divide-white/4">
            {stats.recentPendingWithdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 hover:bg-white/2 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center text-xs font-black text-violet-400 flex-shrink-0">
                    {w.user.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold leading-tight truncate">{w.user.name}</p>
                    <p className="text-slate-600 text-[11px] truncate">{w.user.email} · {w.method}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-violet-400 font-black text-sm">{fmt(w.amount)}</p>
                  <p className="text-slate-700 text-[11px]">{new Date(w.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            href: "/admin/users",
            label: "Gerenciar Usuários",
            desc: "Win rate, saldo e bloqueios",
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
          },
          {
            href: "/admin/withdrawals",
            label: "Aprovar Saques",
            desc: "Pendências aguardando ação",
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
          },
          {
            href: "/admin/settings",
            label: "Configurações",
            desc: "Win rate global, gateways",
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3" strokeWidth={1.5}/></svg>,
          },
        ].map((c) => (
          <Link key={c.href} href={c.href}
            className="bg-[#0d0a1a] border border-white/6 hover:border-violet-500/25 rounded-2xl p-5 transition-all group flex items-start gap-4">
            <div className="w-10 h-10 bg-violet-500/8 group-hover:bg-violet-500/15 rounded-xl flex items-center justify-center text-violet-400/60 group-hover:text-violet-400 transition-all flex-shrink-0">
              {c.icon}
            </div>
            <div>
              <p className="text-white font-semibold text-sm group-hover:text-violet-400 transition-colors mb-0.5">{c.label}</p>
              <p className="text-slate-600 text-[11px]">{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
