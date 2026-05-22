"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function AfiliadosRegisterForm() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [parentRef, setParentRef] = useState("");
  const [parentName, setParentName] = useState("");

  useEffect(() => {
    const ref = searchParams.get("ref") ?? "";
    if (/^[a-z0-9]{20,30}$/i.test(ref)) {
      setParentRef(ref);
      // Fetch parent affiliate name for display
      fetch(`/api/afiliados/info?id=${ref}`).then((r) => r.json()).then((d) => {
        if (d.name) setParentName(d.name);
      }).catch(() => {});
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/afiliados/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, ...(parentRef ? { parentRef } : {}) }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erro ao criar conta");
      setLoading(false);
      return;
    }

    const data = await res.json();
    if (data.pending) {
      setPendingApproval(true);
      setLoading(false);
      return;
    }

    router.push("/afiliados/dashboard");
  }

  if (pendingApproval) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Cadastro enviado!</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-2">
            Seu cadastro está <strong className="text-emerald-400">aguardando aprovação</strong>.
          </p>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            {parentName
              ? <>O responsável <strong className="text-white">{parentName}</strong> será notificado e entrará em contato em breve.</>
              : <>Nossa equipe irá analisar seu cadastro e entrará em contato em breve.</>
            }
          </p>
          <a href="/afiliados/login" className="inline-block text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
            ← Voltar para o login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-[#1e2a42] relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-[#080c14] font-black text-sm">PB</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-white">
            Prime<span className="text-emerald-400"> Afiliados</span>
          </span>
        </div>

        <div className="relative z-10">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-emerald-400/70 uppercase mb-4">
            O melhor revenue share do mercado
          </p>
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Ganhe <span className="text-emerald-400">90%</span><br />
            de tudo que seus<br />
            indicados perderem.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-10 max-w-sm">
            Sem teto de ganhos. Sem burocracia. Saque via PIX quando quiser.
          </p>

          <div className="space-y-3">
            {["Cadastro 100% gratuito", "Links ilimitados de divulgação", "Relatórios em tempo real", "Saques automáticos via PIX"].map((f) => (
              <div key={f} className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-4 h-4 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-400 text-[10px]">✓</span>
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-700 text-xs relative z-10">
          © 2025 Prime Broker — Programa de Afiliados Premium
        </p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 justify-center mb-10 lg:hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
              <span className="text-[#080c14] font-black text-xs">PB</span>
            </div>
            <span className="font-bold text-base text-white">
              Prime<span className="text-emerald-400"> Afiliados</span>
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Criar conta de afiliado</h2>
            {parentName ? (
              <p className="text-slate-400 text-sm">
                Você foi convidado por <strong className="text-emerald-400">{parentName}</strong>
              </p>
            ) : (
              <p className="text-slate-500 text-sm">Comece a ganhar em minutos</p>
            )}
          </div>

          <div className="bg-[#0d1117] border border-[#1e2a42] rounded-2xl p-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Nome completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  required
                  className="w-full bg-[#080c14] border border-[#1e2a42] rounded-xl px-4 py-3 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>

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
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                  className="w-full bg-[#080c14] border border-[#1e2a42] rounded-xl px-4 py-3 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-50 text-[#080c14] font-bold rounded-xl py-3 text-sm transition-all mt-1"
              >
                {loading ? "Criando conta…" : "Criar conta grátis"}
              </button>
            </form>
          </div>

          <p className="text-center text-slate-600 text-sm mt-6">
            Já tem conta?{" "}
            <Link href="/afiliados/login" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AfiliadosRegisterPage() {
  return (
    <Suspense>
      <AfiliadosRegisterForm />
    </Suspense>
  );
}
