"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AfiliadosLoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [statusCode, setStatusCode] = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatusCode(null);

    const res = await fetch("/api/afiliados/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erro ao entrar");
      setStatusCode(data.statusCode ?? null);
      setLoading(false);
      return;
    }

    router.push("/afiliados/dashboard");
  }

  const statusBanner = statusCode === "PENDING" ? (
    <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 flex items-start gap-3">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400 flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <div>
        <div className="text-amber-400 text-sm font-semibold">Aguardando aprovação</div>
        <div className="text-amber-400/70 text-xs mt-0.5">{error}</div>
      </div>
    </div>
  ) : statusCode === "REJECTED" ? (
    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-400 flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      <div>
        <div className="text-rose-400 text-sm font-semibold">Inscrição recusada</div>
        <div className="text-rose-400/70 text-xs mt-0.5">{error}</div>
      </div>
    </div>
  ) : statusCode === "BLOCKED" ? (
    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-400 flex-shrink-0 mt-0.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <div>
        <div className="text-rose-400 text-sm font-semibold">Conta bloqueada</div>
        <div className="text-rose-400/70 text-xs mt-0.5">{error}</div>
      </div>
    </div>
  ) : error ? (
    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-sm">{error}</div>
  ) : null;

  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-10">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-[#080c14] font-black text-sm">PB</span>
          </div>
          <span className="font-bold text-lg tracking-tight">
            <span className="text-white">Prime</span>
            <span className="text-emerald-400"> Afiliados</span>
          </span>
        </div>

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-1">Entrar na sua conta</h2>
          <p className="text-slate-500 text-sm">Acesse seu dashboard de afiliado</p>
        </div>

        <div className="bg-[#0d1117] border border-[#1e2a42] rounded-2xl p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            {statusBanner}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full bg-[#080c14] border border-[#1e2a42] rounded-xl px-4 py-3 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                required
                className="w-full bg-[#080c14] border border-[#1e2a42] rounded-xl px-4 py-3 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-50 text-[#080c14] font-bold rounded-xl py-3 text-sm transition-all mt-1"
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-sm mt-6">
          Não tem conta?{" "}
          <Link href="/afiliados/register" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
            Cadastre-se grátis
          </Link>
        </p>
        <p className="text-center mt-2">
          <Link href="/afiliados" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
            ← Voltar para o programa
          </Link>
        </p>
      </div>
    </div>
  );
}
