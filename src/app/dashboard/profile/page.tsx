"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getUserLevel } from "@/lib/utils";

export default function ProfilePage() {
  const { data: session } = useSession();

  const [name, setName]                 = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]   = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nameMsg, setNameMsg]           = useState<{ text: string; ok: boolean } | null>(null);
  const [passMsg, setPassMsg]           = useState<{ text: string; ok: boolean } | null>(null);
  const [savingName, setSavingName]     = useState(false);
  const [savingPass, setSavingPass]     = useState(false);
  const [balance,        setBalance]        = useState<number | null>(null);
  const [stats,          setStats]          = useState<{ settled: number; wins: number; pnl: number } | null>(null);
  const [totalDeposited, setTotalDeposited] = useState<number>(0);
  const [allTrades,      setAllTrades]      = useState<Array<{ result: string; profit: number; amount: number; createdAt: string }>>([]);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session]);

  useEffect(() => {
    fetch("/api/user").then((r) => r.json()).then((d) => {
      setBalance(d.balance);
      setTotalDeposited(d.totalDeposited ?? 0);
    }).catch(() => {});
    fetch("/api/trades").then((r) => r.json()).then((trades: Array<{ result: string; profit: number; amount: number; createdAt: string }>) => {
      setAllTrades(trades);
      const settled = trades.filter((t) => t.result !== "PENDING");
      const wins    = settled.filter((t) => t.result === "WIN");
      const pnl     = wins.reduce((s, t) => s + t.profit, 0) - settled.filter((t) => t.result === "LOSS").reduce((s, t) => s + t.amount, 0);
      setStats({ settled: settled.length, wins: wins.length, pnl });
    }).catch(() => {});
  }, []);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true); setNameMsg(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        setNameMsg({ text: "Nome atualizado com sucesso!", ok: true });
      } else {
        setNameMsg({ text: data.error ?? "Erro ao atualizar", ok: false });
      }
    } catch {
      setNameMsg({ text: "Erro de conexão", ok: false });
    } finally { setSavingName(false); }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassMsg({ text: "As senhas não coincidem", ok: false }); return;
    }
    setSavingPass(true); setPassMsg(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPassMsg({ text: "Senha alterada com sucesso!", ok: true });
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      } else {
        setPassMsg({ text: data.error ?? "Erro ao alterar senha", ok: false });
      }
    } catch {
      setPassMsg({ text: "Erro de conexão", ok: false });
    } finally { setSavingPass(false); }
  }

  const inputCls = "w-full bg-[#080c14] border border-[#1e2a42] rounded-xl px-4 py-3 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all";
  const labelCls = "block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide";

  const userLevel = getUserLevel(totalDeposited);

  // Cumulative P&L chart data
  const pnlPoints = useMemo(() => {
    const settled = allTrades
      .filter(t => t.result === "WIN" || t.result === "LOSS")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let cum = 0;
    return settled.map(t => {
      cum += t.result === "WIN" ? t.profit : -t.amount;
      return cum;
    });
  }, [allTrades]);

  return (
    <div className="min-h-screen bg-[#080c14] p-6">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-300 transition-colors p-2 hover:bg-white/5 rounded-xl">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">Meu Perfil</h1>
            <p className="text-slate-600 text-xs">{session?.user?.email}</p>
          </div>
        </div>

        {/* Stats card */}
        <div className="bg-[#0c1018] border border-[#1e2a42] rounded-2xl p-5 mb-6 card-shadow">
          <div className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest mb-4">Resumo da conta</div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-[9px] text-slate-600 uppercase tracking-wide mb-1">Saldo</div>
              <div className="text-lg font-bold text-white font-mono">
                {balance === null ? "…" : `$${balance.toFixed(2)}`}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-slate-600 uppercase tracking-wide mb-1">Operações</div>
              <div className="text-lg font-bold text-white">{stats?.settled ?? "…"}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-600 uppercase tracking-wide mb-1">P&L</div>
              <div className={`text-lg font-bold font-mono ${stats === null ? "text-white" : stats.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {stats === null ? "…" : `${stats.pnl >= 0 ? "+" : ""}$${stats.pnl.toFixed(2)}`}
              </div>
            </div>
          </div>
        </div>

        {/* Level badge */}
        <div className="bg-[#0c1018] border border-[#1e2a42] rounded-2xl p-5 mb-6 card-shadow">
          <div className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest mb-4">Nível da conta</div>
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black border-2 shrink-0"
              style={{ borderColor: userLevel.color, background: `${userLevel.color}18` }}
            >
              {userLevel.level === 4 ? "👑" : userLevel.level === 3 ? "🥇" : userLevel.level === 2 ? "🥈" : "🥉"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-black text-white text-lg">{userLevel.name}</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold border"
                  style={{ color: userLevel.color, borderColor: `${userLevel.color}40`, background: `${userLevel.color}15` }}>
                  Nível {userLevel.level}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mb-2">
                Payout: <span className="font-bold" style={{ color: userLevel.color }}>{(userLevel.payoutRate * 100).toFixed(0)}%</span>
                {userLevel.nextAt !== null && (
                  <> · Próximo nível em <span className="font-bold text-white">${userLevel.nextAt - totalDeposited > 0 ? (userLevel.nextAt - totalDeposited).toFixed(0) : "0"}</span> depositados</>
                )}
              </div>
              {userLevel.nextAt !== null && (
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (totalDeposited / userLevel.nextAt) * 100)}%`,
                      background: userLevel.color,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* P&L chart */}
        {pnlPoints.length > 1 && (
          <div className="bg-[#0c1018] border border-[#1e2a42] rounded-2xl p-5 mb-6 card-shadow">
            <div className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest mb-4">P&L Cumulativo</div>
            {(() => {
              const W = 400, H = 80, pad = 6;
              const min = Math.min(0, ...pnlPoints);
              const max = Math.max(0, ...pnlPoints);
              const range = max - min || 1;
              const pts = pnlPoints.map((v, i) => {
                const x = pad + (i / Math.max(pnlPoints.length - 1, 1)) * (W - 2 * pad);
                const y = H - pad - ((v - min) / range) * (H - 2 * pad);
                return `${x},${y}`;
              }).join(" ");
              const lastPnl = pnlPoints[pnlPoints.length - 1];
              const isPositive = lastPnl >= 0;
              const zeroY = H - pad - ((0 - min) / range) * (H - 2 * pad);

              return (
                <div className="relative w-full" style={{ aspectRatio: `${W}/${H}` }}>
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
                    {/* Zero line */}
                    <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    {/* Area fill */}
                    <polygon
                      points={`${pad},${zeroY} ${pts} ${W - pad},${zeroY}`}
                      fill={isPositive ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)"}
                    />
                    {/* Line */}
                    <polyline
                      points={pts}
                      fill="none"
                      stroke={isPositive ? "#10b981" : "#ef4444"}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              );
            })()}
            <div className="flex justify-between items-center mt-2">
              <span className="text-[9px] text-slate-600">{pnlPoints.length} operações</span>
              <span className={`text-xs font-bold font-mono ${pnlPoints[pnlPoints.length - 1] >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {pnlPoints[pnlPoints.length - 1] >= 0 ? "+" : ""}${pnlPoints[pnlPoints.length - 1].toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Update name */}
        <div className="bg-[#0c1018] border border-[#1e2a42] rounded-2xl p-6 mb-4 card-shadow">
          <h2 className="text-sm font-bold text-white mb-5">Informações</h2>
          <form onSubmit={saveName} className="space-y-4">
            <div>
              <label className={labelCls}>Nome</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={session?.user?.email ?? ""} disabled className={`${inputCls} opacity-40 cursor-not-allowed`} />
            </div>
            {nameMsg && (
              <p className={`text-xs ${nameMsg.ok ? "text-emerald-400" : "text-rose-400"}`}>{nameMsg.text}</p>
            )}
            <button type="submit" disabled={savingName}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-[#080c14] font-bold rounded-xl py-2.5 text-sm transition-all gold-glow"
            >
              {savingName ? "Salvando…" : "Salvar nome"}
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className="bg-[#0c1018] border border-[#1e2a42] rounded-2xl p-6 card-shadow">
          <h2 className="text-sm font-bold text-white mb-5">Alterar Senha</h2>
          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label className={labelCls}>Senha atual</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Nova senha</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required className={inputCls} />
              {/* Password strength indicator */}
              {newPassword.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4].map((level) => {
                    const strength = newPassword.length < 6 ? 1 : newPassword.length < 8 ? 2 : /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 4 : 3;
                    return (
                      <div key={level} className={`h-1 flex-1 rounded-full transition-colors ${
                        level <= strength
                          ? strength <= 1 ? "bg-rose-500"
                          : strength <= 2 ? "bg-amber-500"
                          : strength <= 3 ? "bg-blue-400"
                          : "bg-emerald-500"
                          : "bg-[#1e2a42]"
                      }`} />
                    );
                  })}
                </div>
              )}
              {newPassword.length > 0 && (
                <p className={`text-[10px] mt-1 ${
                  newPassword.length < 6 ? "text-rose-400"
                  : newPassword.length < 8 ? "text-amber-400"
                  : /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? "text-emerald-400"
                  : "text-blue-400"
                }`}>
                  {newPassword.length < 6 ? "Muito fraca"
                  : newPassword.length < 8 ? "Fraca"
                  : /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? "Forte"
                  : "Média"}
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>Confirmar nova senha</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required className={inputCls} />
              {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                <p className="text-[10px] text-rose-400 mt-1">Senhas não coincidem</p>
              )}
            </div>
            {passMsg && (
              <p className={`text-xs ${passMsg.ok ? "text-emerald-400" : "text-rose-400"}`}>{passMsg.text}</p>
            )}
            <button type="submit" disabled={savingPass}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-[#080c14] font-bold rounded-xl py-2.5 text-sm transition-all gold-glow"
            >
              {savingPass ? "Alterando…" : "Alterar senha"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
