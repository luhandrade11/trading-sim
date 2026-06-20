"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email ou senha inválidos");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex bg-[#080c14]">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-[#1e2a42] relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <img src="/logo.png" alt="Prime Broker" className="w-12 h-12 object-contain" />
          <span className="font-bold text-lg tracking-tight">
            <span className="text-white">Prime</span>
            <span className="text-amber-400"> Broker</span>
          </span>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/70 uppercase mb-4">
            Simulador Profissional
          </p>
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Opera como os<br />
            <span className="text-amber-400">grandes players.</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-10 max-w-sm">
            Plataforma de simulação com dados de mercado em tempo real, gráficos avançados e gestão de risco.
          </p>

          <div className="space-y-4">
            {[
              { icon: "◆", label: "Gráficos ao vivo", sub: "Dados reais de BTC, ETH, SOL, EUR/USD" },
              { icon: "◆", label: "5 ativos disponíveis", sub: "Cripto e Forex em tempo real" },
              { icon: "◆", label: "Saldo virtual $1.000", sub: "Sem risco, aprendizado garantido" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <span className="text-amber-400 text-xs mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-white text-sm font-medium">{item.label}</p>
                  <p className="text-slate-500 text-xs">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom disclaimer */}
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
            <h2 className="text-2xl font-bold text-white mb-1">Bem-vindo de volta</h2>
            <p className="text-slate-500 text-sm">Entre na sua conta para continuar</p>
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
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#080c14] border border-[#1e2a42] rounded-xl px-4 py-3 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-[#080c14] font-bold rounded-xl py-3 text-sm transition-all gold-glow mt-1"
              >
                {loading ? "Entrando…" : "Entrar na plataforma"}
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
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-[#1f1f1f] font-semibold rounded-xl py-3 text-sm transition-all"
            >
              <GoogleIcon /> Continuar com Google
            </button>
          </div>

          <p className="text-center text-slate-600 text-sm mt-6">
            Não tem conta?{" "}
            <Link href="/register" className="text-amber-400 hover:text-amber-300 font-semibold transition-colors">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
