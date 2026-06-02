"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SuspiciousUser {
  id: string;
  name: string;
  email: string;
  realBalance: number;
  isBlocked: boolean;
  trades: number;
  wins: number;
  winRate: number;
  profit: number;
}

interface BulkUser {
  id: string;
  name: string;
  email: string;
  realBalance: number;
  isBlocked: boolean;
  withdrawalCount: number;
}

interface LargeWithdrawal {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

interface RapidDepositor {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  depositAmount: number;
}

interface FraudData {
  suspiciousWinRate: SuspiciousUser[];
  bulkWithdrawals:   BulkUser[];
  largeWithdrawals:  LargeWithdrawal[];
  rapidDepositors:   RapidDepositor[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function Card({ title, badge, children }: { title: string; badge?: number; children: React.ReactNode }) {
  return (
    <div className="bg-[#0c0918] border border-white/6 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
        <h2 className="font-bold text-white text-sm">{title}</h2>
        {badge !== undefined && badge > 0 && (
          <span className="bg-rose-500/15 text-rose-400 border border-rose-500/25 text-xs font-bold px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function FraudPage() {
  const [data, setData]       = useState<FraudData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/fraud")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-violet-400/20 border-t-violet-400 rounded-full animate-spin" />
    </div>
  );

  if (!data) return <div className="p-8 text-rose-400">Erro ao carregar dados.</div>;

  return (
    <div className="p-8 max-w-6xl space-y-8">
      <div>
        <h1 className="text-xl font-black text-white">Detecção de Fraudes</h1>
        <p className="text-slate-500 text-sm mt-1">Padrões suspeitos dos últimos 7 dias</p>
      </div>

      {/* High win rate */}
      <Card title="Win Rate Anormal (≥85%, ≥10 trades reais)" badge={data.suspiciousWinRate.length}>
        {data.suspiciousWinRate.length === 0 ? (
          <div className="text-center py-10 text-slate-600 text-sm">Nenhum usuário suspeito encontrado.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {data.suspiciousWinRate.map((u) => (
              <div key={u.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{u.name}</span>
                    {u.isBlocked && <span className="text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/25 px-1.5 py-0.5 rounded-full">bloqueado</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{u.email}</div>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-center">
                    <div className="text-lg font-black text-rose-400">{u.winRate}%</div>
                    <div className="text-[10px] text-slate-600">{u.wins}/{u.trades} wins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-emerald-400">{fmt(u.profit)}</div>
                    <div className="text-[10px] text-slate-600">lucro</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-white">{fmt(u.realBalance)}</div>
                    <div className="text-[10px] text-slate-600">saldo</div>
                  </div>
                  <Link href={`/admin/users`} className="text-xs text-violet-400 hover:text-violet-300 underline">Ver</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Bulk withdrawals */}
      <Card title="Múltiplos Saques (≥3 em 7 dias)" badge={data.bulkWithdrawals.length}>
        {data.bulkWithdrawals.length === 0 ? (
          <div className="text-center py-10 text-slate-600 text-sm">Nenhum padrão detectado.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {data.bulkWithdrawals.map((u) => (
              <div key={u.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-center">
                    <div className="text-xl font-black text-amber-400">{u.withdrawalCount}</div>
                    <div className="text-[10px] text-slate-600">saques</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-white">{fmt(u.realBalance)}</div>
                    <div className="text-[10px] text-slate-600">saldo atual</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Large withdrawals */}
      <Card title="Saques Grandes (≥$500)" badge={data.largeWithdrawals.length}>
        {data.largeWithdrawals.length === 0 ? (
          <div className="text-center py-10 text-slate-600 text-sm">Nenhum saque grande.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {data.largeWithdrawals.map((w) => (
              <div key={w.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{w.user.name}</div>
                  <div className="text-xs text-slate-500">{w.user.email}</div>
                  <div className="text-xs text-slate-700 mt-0.5">{new Date(w.createdAt).toLocaleDateString("pt-BR")}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xl font-black text-white font-mono">{fmt(w.amount)}</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                    w.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" :
                    w.status === "REJECTED" ? "bg-rose-500/10 text-rose-400 border-rose-500/25" :
                    "bg-amber-500/10 text-amber-400 border-amber-500/25"
                  }`}>{w.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Rapid depositors */}
      <Card title="Depósito em &lt;1h após Cadastro" badge={data.rapidDepositors.length}>
        {data.rapidDepositors.length === 0 ? (
          <div className="text-center py-10 text-slate-600 text-sm">Nenhum padrão detectado.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {data.rapidDepositors.map((u) => (
              <div key={u.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                  <div className="text-xs text-slate-700 mt-0.5">Cadastrou: {new Date(u.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <div className="text-xl font-black text-amber-400 font-mono">{fmt(u.depositAmount)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
