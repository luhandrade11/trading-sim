"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

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

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-[#1e2a42]" />
              <span className="text-[10px] text-slate-600 uppercase tracking-wider">ou</span>
              <div className="flex-1 h-px bg-[#1e2a42]" />
            </div>

            <button
              type="button"
              onClick={() => {
                // Preserve affiliate attribution through the OAuth redirect
                if (affRef) {
                  document.cookie = `aff_ref=${affRef}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
                }
                signIn("google", { callbackUrl: "/dashboard" });
              }}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-[#1f1f1f] font-semibold rounded-xl py-3 text-sm transition-all"
            >
              <GoogleIcon /> Cadastrar com Google
            </button>
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
