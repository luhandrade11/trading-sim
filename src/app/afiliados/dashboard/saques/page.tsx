"use client";

import { useEffect, useState } from "react";

interface Withdrawal {
  id: string;
  amount: number;
  pixKey: string;
  status: string;
  createdAt: string;
}

interface Me {
  balance: number;
  pixKey: string | null;
  lastWithdrawalAt: string | null;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const STATUS: Record<string, { label: string; style: string; dot: string }> = {
  PENDING:  { label: "Em análise",  style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",   dot: "bg-emerald-400" },
  APPROVED: { label: "Aprovado",    style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25", dot: "bg-emerald-400" },
  REJECTED: { label: "Recusado",    style: "bg-rose-500/10 text-rose-400 border-rose-500/25",       dot: "bg-rose-400" },
};

function daysUntil(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

export default function AfiliadosSaquesPage() {
  const [me, setMe]                   = useState<Me | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading]         = useState(true);
  const [amount, setAmount]           = useState("");
  const [pixKey, setPixKey]           = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState(false);
  const [nextAt, setNextAt]           = useState<string | null>(null);

  async function load() {
    const [meRes, wRes] = await Promise.all([
      fetch("/api/afiliados/me"),
      fetch("/api/afiliados/withdraw"),
    ]);
    const meData = await meRes.json();
    const wData  = await wRes.json();
    setMe(meData);
    setPixKey(meData.pixKey ?? "");
    setWithdrawals(Array.isArray(wData) ? wData : []);

    // Compute next withdrawal from lastWithdrawalAt
    if (meData.lastWithdrawalAt) {
      const next = new Date(meData.lastWithdrawalAt);
      next.setDate(next.getDate() + 7);
      if (next > new Date()) setNextAt(next.toISOString());
      else setNextAt(null);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(false);

    const r = await fetch("/api/afiliados/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), pixKey }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error || "Erro ao solicitar saque");
      if (d.nextWithdrawalAt) setNextAt(d.nextWithdrawalAt);
      setSubmitting(false);
      return;
    }
    setSuccess(true);
    setAmount("");
    load();
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  const balance     = me?.balance ?? 0;
  const hasPending  = withdrawals.some((w) => w.status === "PENDING");
  const cooldownOn  = !!nextAt;
  const canWithdraw = !cooldownOn && !hasPending && balance >= 50;
  const days        = nextAt ? daysUntil(nextAt) : 0;

  const totalApproved = withdrawals
    .filter((w) => w.status === "APPROVED")
    .reduce((acc, w) => acc + w.amount, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Saques</h1>
        <p className="text-slate-500 text-sm mt-0.5">Transfira seus ganhos via PIX</p>
      </div>

      {/* Balance hero */}
      <div className={`relative rounded-2xl p-6 overflow-hidden border transition-all duration-500 ${
        canWithdraw
          ? "bg-gradient-to-br from-emerald-500/12 via-emerald-500/6 to-transparent border-emerald-500/25"
          : "bg-gradient-to-br from-white/3 to-transparent border-white/6"
      }`}>
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-400/5 rounded-full blur-3xl" />
        <div className="relative">
          <div className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-semibold mb-1.5">Saldo disponível</div>
          <div className={`text-5xl font-black font-mono mb-1 transition-colors duration-300 ${canWithdraw ? "text-white" : "text-slate-300"}`}>
            {fmt(balance)}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="text-xs text-slate-600">
              Mínimo: <span className="text-slate-400 font-medium">$50.00</span>
            </div>
            {totalApproved > 0 && (
              <div className="text-xs text-slate-600">
                Sacado total: <span className="text-emerald-400 font-medium">{fmt(totalApproved)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cooldown warning */}
      {cooldownOn && (
        <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-emerald-400">Aguardando período de cooldown</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Os saques têm um intervalo mínimo de 7 dias.{" "}
                {days > 0
                  ? <>Próximo disponível em <strong className="text-emerald-300">{days} dia{days !== 1 ? "s" : ""}</strong> ({new Date(nextAt!).toLocaleDateString("pt-BR")})</>
                  : <>Disponível a partir de <strong className="text-emerald-300">{new Date(nextAt!).toLocaleDateString("pt-BR")}</strong></>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {hasPending && !cooldownOn && (
        <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-2xl px-5 py-4 flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
          <div className="text-sm text-emerald-400">Você já tem um saque em análise. Aguarde a aprovação antes de solicitar outro.</div>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-4 flex items-center gap-3">
          <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div className="text-sm text-emerald-400">Solicitação enviada! Será processada em até 24 horas úteis.</div>
        </div>
      )}

      {/* Request form */}
      <div className="bg-[#0d1117] border border-white/6 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="font-bold text-white text-sm">Solicitar saque via PIX</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">O valor será transferido em BRL com a cotação do dia</p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
              Valor do saque (USD)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg font-bold select-none">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min={50}
                max={balance}
                step="0.01"
                required
                disabled={!canWithdraw}
                className="w-full bg-[#080c14] border border-white/8 rounded-xl pl-10 pr-4 py-3.5 text-white text-lg font-bold font-mono placeholder-slate-700 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              />
              {balance >= 50 && !cooldownOn && !hasPending && (
                <button
                  type="button"
                  onClick={() => setAmount(balance.toFixed(2))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-1 rounded-lg transition-all"
                >
                  MAX
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
              Chave PIX
            </label>
            <input
              type="text"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
              required
              disabled={!canWithdraw}
              className="w-full bg-[#080c14] border border-white/8 rounded-xl px-4 py-3.5 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !canWithdraw}
            className="w-full relative overflow-hidden bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3.5 text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.99]"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processando…
              </span>
            ) : cooldownOn ? (
              `Disponível em ${days} dia${days !== 1 ? "s" : ""}`
            ) : hasPending ? (
              "Saque em análise"
            ) : balance < 50 ? (
              "Saldo insuficiente (mín. $50)"
            ) : (
              "Solicitar saque"
            )}
          </button>
        </form>

        <div className="px-5 pb-5 flex items-start gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-700 flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p className="text-[11px] text-slate-700 leading-relaxed">
            Saques são processados em até 24h úteis. Apenas 1 saque a cada 7 dias. O valor é convertido para BRL na cotação comercial do dia.
          </p>
        </div>
      </div>

      {/* History */}
      <div className="bg-[#0d1117] border border-white/6 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="font-bold text-white text-sm">Histórico</h2>
        </div>

        {withdrawals.length === 0 ? (
          <div className="text-center py-14">
            <div className="text-4xl mb-3">↗</div>
            <p className="text-sm text-slate-600">Nenhum saque solicitado ainda.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/4">
            {withdrawals.map((w) => {
              const s = STATUS[w.status] ?? { label: w.status, style: "bg-slate-500/10 text-slate-400 border-slate-500/20", dot: "bg-slate-400" };
              return (
                <div key={w.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-base font-black text-white font-mono">{fmt(w.amount)}</div>
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${s.style}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${w.status === "PENDING" ? "animate-pulse" : ""}`} />
                        {s.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-mono mt-0.5 truncate">{w.pixKey}</div>
                    <div className="text-[10px] text-slate-700 mt-0.5">
                      {new Date(w.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
