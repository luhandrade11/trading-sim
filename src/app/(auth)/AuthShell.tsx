"use client";

import Link from "next/link";
import { ReactNode } from "react";

/* ─── Shared premium field styles ─────────────────────────────────────────── */
export const labelClass =
  "mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400";

export const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[15px] text-white placeholder-slate-600 outline-none transition-all duration-300 " +
  "focus:border-[#2563EB]/70 focus:bg-white/[0.05] focus:ring-2 focus:ring-[#2563EB]/25 focus:shadow-[0_0_24px_-6px_rgba(37,99,235,0.65)]";

/* Primary CTA — gold gradient with a sweeping light highlight */
export function PrimaryButton({
  children,
  loading,
  loadingLabel,
}: {
  children: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group relative mt-1 w-full overflow-hidden rounded-xl py-3.5 text-sm font-bold text-[#1a1206] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60
                 bg-gradient-to-r from-[#F59E0B] via-[#fbbf24] to-[#F59E0B] hover:shadow-[0_8px_30px_-6px_rgba(245,158,11,0.6)] hover:-translate-y-[1px] active:translate-y-0"
    >
      <span
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover:translate-x-full"
      />
      <span className="relative">{loading ? loadingLabel : children}</span>
    </button>
  );
}

export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function Logo({ size = "lg" }: { size?: "lg" | "sm" }) {
  const dim = size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const txt = size === "lg" ? "text-xl" : "text-base";
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Prime Broker" className={`${dim} object-contain drop-shadow-[0_0_12px_rgba(245,158,11,0.35)]`} />
      <span className={`font-bold tracking-tight ${txt}`}>
        <span className="text-white">Prime</span>
        <span className="text-[#F59E0B]"> Broker</span>
      </span>
    </div>
  );
}

/* ─── Animated equity chart (pure SVG) ────────────────────────────────────── */
function EquityChart() {
  const line = "M0,150 C45,140 70,150 110,120 S180,128 220,90 S300,86 340,52 S395,40 420,18";
  const area = `${line} L420,170 L0,170 Z`;
  return (
    <svg viewBox="0 0 420 170" className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.35" />
          <stop offset="55%" stopColor="#2563EB" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="eqLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#eqFill)" />
      <path
        d={line}
        fill="none"
        stroke="url(#eqLine)"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="pb-draw"
        style={{ filter: "drop-shadow(0 2px 8px rgba(37,99,235,0.45))" }}
      />
      {/* live dot */}
      <circle cx="420" cy="18" r="5" fill="#F59E0B" className="pb-pulse" />
      <circle cx="420" cy="18" r="5" fill="#F59E0B" />
    </svg>
  );
}

function Candles() {
  const heights = [40, 62, 34, 70, 48, 80, 58, 92, 72, 100, 84, 110];
  return (
    <div className="flex h-full items-end gap-[6px]">
      {heights.map((h, i) => {
        const up = i % 3 !== 1;
        return (
          <div
            key={i}
            className="flex-1 rounded-[2px]"
            style={{
              height: `${h}%`,
              background: up
                ? "linear-gradient(180deg,#34d399,#10b981)"
                : "linear-gradient(180deg,#fb7185,#e11d48)",
              opacity: 0.85,
              animation: `pb-rise 1.1s ${i * 0.06}s cubic-bezier(.22,1,.36,1) both`,
            }}
          />
        );
      })}
    </div>
  );
}

function StatCard({ label, value, accent, delta }: { label: string; value: string; accent: string; delta?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1.5 font-mono text-2xl font-bold text-white">{value}</p>
      {delta && (
        <p className="mt-0.5 text-xs font-semibold" style={{ color: accent }}>
          {delta}
        </p>
      )}
    </div>
  );
}

/* ─── Main shell ──────────────────────────────────────────────────────────── */
export function AuthShell({
  mode,
  heading,
  subheading,
  children,
  onGoogle,
  googleLabel,
  footer,
}: {
  mode: "login" | "register";
  heading: string;
  subheading: string;
  children: ReactNode;
  onGoogle: () => void;
  googleLabel: string;
  footer: ReactNode;
}) {
  const tabBase =
    "relative flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-all duration-300";
  const tabActive = "bg-white/[0.07] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]";
  const tabIdle = "text-slate-500 hover:text-slate-300";

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#030712] text-white">
      {/* ── Background layers ── */}
      <div className="pointer-events-none absolute inset-0">
        {/* volumetric glows */}
        <div className="absolute -left-40 -top-40 h-[40rem] w-[40rem] rounded-full bg-[#2563EB]/15 blur-[140px]" />
        <div className="absolute -bottom-52 right-[-10rem] h-[36rem] w-[36rem] rounded-full bg-[#F59E0B]/10 blur-[150px]" />
        <div className="absolute left-1/2 top-1/3 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#7c3aed]/10 blur-[160px]" />
        {/* grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, #000 40%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, #000 40%, transparent 100%)",
          }}
        />
        {/* particles */}
        {Array.from({ length: 22 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white/30"
            style={{
              left: `${(i * 47.3) % 100}%`,
              top: `${(i * 31.7) % 100}%`,
              width: `${1 + (i % 3)}px`,
              height: `${1 + (i % 3)}px`,
              opacity: 0.15 + (i % 4) * 0.08,
              animation: `pb-float ${6 + (i % 5)}s ${(i % 7) * 0.4}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        {/* ── LEFT: hero / product showcase ── */}
        <section className="relative hidden flex-col justify-between border-r border-white/5 p-12 lg:flex lg:w-[58%] xl:p-16">
          <Logo />

          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 backdrop-blur-md">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[11px] font-medium tracking-wide text-slate-300">Mercados ao vivo · 24/7</span>
            </div>

            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-white xl:text-6xl">
              Invista como os<br />
              <span className="bg-gradient-to-r from-[#F59E0B] via-[#fbbf24] to-[#2563EB] bg-clip-text text-transparent">
                grandes players.
              </span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-slate-400">
              Tecnologia de nível institucional, dados de mercado em tempo real e
              execução precisa. Sua mesa de operações profissional.
            </p>

            {/* Dashboard mock */}
            <div className="mt-9 max-w-lg rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 backdrop-blur-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Patrimônio total</p>
                  <p className="font-mono text-3xl font-bold text-white">
                    $128.450<span className="text-slate-500">.20</span>
                  </p>
                </div>
                <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  ▲ 18,4%
                </div>
              </div>

              {/* chart + candles */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 h-28 overflow-hidden rounded-xl border border-white/5 bg-black/20 p-1">
                  <EquityChart />
                </div>
                <div className="h-28 overflow-hidden rounded-xl border border-white/5 bg-black/20 p-2">
                  <Candles />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-3">
                <StatCard label="Portfólio" value="$128k" accent="#2563EB" />
                <StatCard label="Lucro hoje" value="+$2.840" accent="#34d399" delta="▲ 2,3%" />
                <StatCard label="Crescimento" value="+18,4%" accent="#F59E0B" delta="30 dias" />
              </div>
            </div>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-10">
            {[
              { v: "+127.000", l: "investidores" },
              { v: "US$ 2,3 bi", l: "negociados" },
              { v: "97", l: "países" },
            ].map((s) => (
              <div key={s.l}>
                <p className="text-2xl font-bold text-white">{s.v}</p>
                <p className="text-xs text-slate-500">{s.l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── RIGHT: auth card ── */}
        <section className="flex w-full flex-1 items-center justify-center p-6 lg:w-[42%]">
          <div className="w-full max-w-md">
            {/* mobile logo */}
            <div className="mb-8 flex justify-center lg:hidden">
              <Logo size="sm" />
            </div>

            {/* glass card */}
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-1.5 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
              <div className="rounded-[22px] border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent p-7 sm:p-8">
                {/* tabs */}
                <div className="mb-7 flex gap-1 rounded-xl border border-white/[0.06] bg-black/30 p-1">
                  <Link href="/login" className={`${tabBase} ${mode === "login" ? tabActive : tabIdle}`}>
                    Entrar
                  </Link>
                  <Link href="/register" className={`${tabBase} ${mode === "register" ? tabActive : tabIdle}`}>
                    Criar conta
                  </Link>
                </div>

                <div className="mb-6">
                  <h2 className="text-2xl font-bold tracking-tight text-white">{heading}</h2>
                  <p className="mt-1 text-sm text-slate-500">{subheading}</p>
                </div>

                {/* form (per-page) */}
                {children}

                {/* divider */}
                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-600">ou continue com</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* Google */}
                <button
                  type="button"
                  onClick={onGoogle}
                  className="group flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:border-white/20 hover:bg-white/[0.09]"
                >
                  <GoogleIcon /> {googleLabel}
                </button>

                {/* security line */}
                <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-600">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" />
                  </svg>
                  Conexão segura · criptografia de ponta a ponta
                </div>
              </div>
            </div>

            {/* footer */}
            <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
          </div>
        </section>
      </div>

      {/* keyframes */}
      <style>{`
        @keyframes pb-draw { from { stroke-dasharray: 900; stroke-dashoffset: 900; } to { stroke-dasharray: 900; stroke-dashoffset: 0; } }
        .pb-draw { animation: pb-draw 2.4s cubic-bezier(.22,1,.36,1) forwards; }
        @keyframes pb-pulse { 0% { r: 5; opacity: .9; } 70% { r: 16; opacity: 0; } 100% { r: 16; opacity: 0; } }
        .pb-pulse { animation: pb-pulse 2s ease-out infinite; transform-box: fill-box; }
        @keyframes pb-rise { from { transform: scaleY(0); transform-origin: bottom; opacity: 0; } to { transform: scaleY(1); opacity: .85; } }
        @keyframes pb-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
      `}</style>
    </div>
  );
}
