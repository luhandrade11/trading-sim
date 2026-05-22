"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push("/admin");
    } else {
      const d = await res.json();
      setError(d.error ?? "Erro ao autenticar");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#0a0612] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-10">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-[#080c14] font-black text-sm">ADM</span>
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">Prime Broker</p>
            <p className="text-violet-400 text-xs font-semibold">Painel Administrativo</p>
          </div>
        </div>

        <div className="bg-[#0d1117] border border-[#1e1532] rounded-2xl p-7 shadow-2xl">
          <h1 className="text-xl font-bold text-white mb-6">Entrar como Admin</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#080c14] border border-[#1e1532] rounded-xl px-4 py-3 text-white text-sm placeholder-slate-700 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#080c14] border border-[#1e1532] rounded-xl px-4 py-3 text-white text-sm placeholder-slate-700 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-500 to-violet-400 hover:from-violet-400 hover:to-violet-300 disabled:opacity-50 text-white font-bold rounded-xl py-3 text-sm transition-all mt-2"
            >
              {loading ? "Autenticando…" : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-700 text-xs mt-6">Acesso restrito · Prime Broker Admin</p>
      </div>
    </div>
  );
}
