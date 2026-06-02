"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function RegisterForm() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [refCode, setRefCode]   = useState("");
  const [affRef, setAffRef]     = useState("");

  useEffect(() => {
    const ref = searchParams.get("ref") ?? "";
    if (/^[a-zA-Z0-9_-]{4,40}$/.test(ref)) setRefCode(ref);
    const aff = searchParams.get("aff") ?? "";
    if (/^[a-zA-Z0-9_-]{4,20}$/.test(aff)) setAffRef(aff);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, ...(refCode ? { referralCode: refCode } : {}), ...(affRef ? { affRef } : {}) }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erro ao criar conta");
      setLoading(false);
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex bg-[#080c14]">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-[#1e2a42] relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <img src="/logo.png" alt="Prime Broker" className="w-12 h-12 object-contain" />
          <span className="font-bold text-lg tracking-tight">
            <span className="text-white">Prime</span>
            <span className="text-amber-400"> Broker</span>
          </span>
        </div>

        <div className="relative z-10">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/70 uppercase mb-4">
            Comece agora — é gratuito
          </p>
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Sua jornada no<br />
            <span className="text-amber-400">trading começa aqui.</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-10 max-w-sm">
            Receba $1.000 virtuais e comece a operar imediatamente com dados de mercado reais.
          </p>

          <div className="bg-[#0d1117] border border-[#1e2a42] rounded-2xl p-5 max-w-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Saldo inicial</span>
              <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">Grátis</span>
            </div>
            <p className="text-3xl font-bold text-white font-mono">$1.000<span className="text-slate-600">.00</span></p>
            <p className="text-xs text-slate-600 mt-1">Sem cartão de crédito necessário</p>
          </div>
        </div>

        <p className="text-slate-700 text-xs relative z-10">
          Plataforma educacional — sem dinheiro real envolvido.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 justify-center mb-10 lg:hidden">
            <img src="/logo.png" alt="Prime Broker" className="w-11 h-11 object-contain" />
            <span className="font-bold text-base">
              <span className="text-white">Prime</span>
              <span className="text-amber-400"> Broker</span>
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Criar conta</h2>
            <p className="text-slate-500 text-sm">Comece com $1.000 de saldo virtual</p>
          </div>

          <div className="bg-[#0d1117] border border-[#1e2a42] rounded-2xl p-7 card-shadow">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-sm flex items-center gap-2">
                  <span className="text-rose-500">⚠</span> {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                  Nome
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  required
                  className="w-full bg-[#080c14] border border-[#1e2a42] rounded-xl px-4 py-3 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full bg-[#080c14] border border-[#1e2a42] rounded-xl px-4 py-3 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                  className="w-full bg-[#080c14] border border-[#1e2a42] rounded-xl px-4 py-3 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-[#080c14] font-bold rounded-xl py-3 text-sm transition-all gold-glow mt-1"
              >
                {loading ? "Criando conta…" : "Criar conta grátis"}
              </button>
            </form>
          </div>

          <p className="text-center text-slate-600 text-sm mt-6">
            Já tem conta?{" "}
            <Link href="/login" className="text-amber-400 hover:text-amber-300 font-semibold transition-colors">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
