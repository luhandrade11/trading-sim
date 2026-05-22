"use client";

import { useState } from "react";

interface Props {
  onComplete: () => void;
  locale:     string;
}

type Locale = "pt-BR" | "en-US" | "es-ES" | "fr-FR" | "de-DE" | "ja-JP";

const STEPS: Record<Locale, Array<{
  icon: string; title: string; sub: string; btnPrimary: string; btnSecondary?: string;
}>> = {
  "pt-BR": [
    { icon: "🎯", title: "Bem-vindo ao PrimeBroker!", sub: "A plataforma de trading mais rápida do Brasil. Opere cripto e forex com precisão.", btnPrimary: "Começar" },
    { icon: "📈", title: "Faça sua primeira operação", sub: "Escolha um ativo, defina um valor e clique em COMPRAR ou VENDER. Simples assim!", btnPrimary: "Entendi" },
    { icon: "💰", title: "Ative sua conta real", sub: "Seu saldo demo é limitado. Deposite agora e opere com dinheiro real, saques disponíveis.", btnPrimary: "Depositar Agora", btnSecondary: "Continuar com Demo" },
  ],
  "en-US": [
    { icon: "🎯", title: "Welcome to PrimeBroker!", sub: "The fastest trading platform. Trade crypto and forex with precision.", btnPrimary: "Get Started" },
    { icon: "📈", title: "Make your first trade", sub: "Choose an asset, set an amount, and click BUY or SELL. That simple!", btnPrimary: "Got it" },
    { icon: "💰", title: "Activate your real account", sub: "Your demo balance is limited. Deposit now and trade with real money.", btnPrimary: "Deposit Now", btnSecondary: "Continue with Demo" },
  ],
  "es-ES": [
    { icon: "🎯", title: "¡Bienvenido a PrimeBroker!", sub: "La plataforma de trading más rápida. Opera cripto y forex con precisión.", btnPrimary: "Comenzar" },
    { icon: "📈", title: "Haz tu primera operación", sub: "Elige un activo, define un monto y haz clic en COMPRAR o VENDER.", btnPrimary: "Entendido" },
    { icon: "💰", title: "Activa tu cuenta real", sub: "Tu saldo demo es limitado. Deposita ahora y opera con dinero real.", btnPrimary: "Depositar Ahora", btnSecondary: "Continuar con Demo" },
  ],
  "fr-FR": [
    { icon: "🎯", title: "Bienvenue sur PrimeBroker !", sub: "La plateforme de trading la plus rapide. Tradez crypto et forex avec précision.", btnPrimary: "Commencer" },
    { icon: "📈", title: "Faites votre premier trade", sub: "Choisissez un actif, définissez un montant et cliquez sur ACHETER ou VENDRE.", btnPrimary: "Compris" },
    { icon: "💰", title: "Activez votre compte réel", sub: "Votre solde démo est limité. Déposez maintenant et tradez avec de l'argent réel.", btnPrimary: "Déposer Maintenant", btnSecondary: "Continuer en Démo" },
  ],
  "de-DE": [
    { icon: "🎯", title: "Willkommen bei PrimeBroker!", sub: "Die schnellste Trading-Plattform. Handeln Sie Krypto und Forex mit Präzision.", btnPrimary: "Loslegen" },
    { icon: "📈", title: "Ersten Trade machen", sub: "Wählen Sie einen Vermögenswert, legen Sie einen Betrag fest und klicken Sie auf KAUFEN oder VERKAUFEN.", btnPrimary: "Verstanden" },
    { icon: "💰", title: "Echtes Konto aktivieren", sub: "Ihr Demo-Guthaben ist begrenzt. Zahlen Sie jetzt ein und handeln Sie mit echtem Geld.", btnPrimary: "Jetzt Einzahlen", btnSecondary: "Mit Demo fortfahren" },
  ],
  "ja-JP": [
    { icon: "🎯", title: "PrimeBrokerへようこそ！", sub: "最速のトレーディングプラットフォーム。クリプトとフォレックスを精度高くトレード。", btnPrimary: "始める" },
    { icon: "📈", title: "最初のトレードをしよう", sub: "資産を選び、金額を設定して、購入または売却をクリック。それだけです！", btnPrimary: "わかった" },
    { icon: "💰", title: "リアル口座を有効化", sub: "デモ残高は限られています。今すぐ入金してリアルマネーでトレード。", btnPrimary: "今すぐ入金", btnSecondary: "デモで続ける" },
  ],
};

async function markOnboardingDone() {
  try {
    await fetch("/api/user/onboarding", { method: "POST" });
  } catch {}
}

export default function OnboardingWizard({ onComplete, locale }: Props) {
  const [step,      setStep]      = useState(0);
  const [animating, setAnimating] = useState(false);

  const loc    = (locale as Locale) in STEPS ? (locale as Locale) : "pt-BR";
  const steps  = STEPS[loc];
  const current = steps[step];

  function goNext() {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      if (step < steps.length - 1) {
        setStep(step + 1);
      } else {
        markOnboardingDone();
        onComplete();
      }
      setAnimating(false);
    }, 200);
  }

  function handleSecondary() {
    markOnboardingDone();
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #050509 0%, #0a0512 50%, #050509 100%)" }}>

      {/* Dots */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {steps.map((_, i) => (
          <div key={i} className={`rounded-full transition-all duration-300 ${
            i === step ? "w-6 h-2 bg-amber-400" : i < step ? "w-2 h-2 bg-amber-400/40" : "w-2 h-2 bg-white/10"
          }`} />
        ))}
      </div>

      {/* Card */}
      <div
        className={`flex flex-col items-center gap-8 px-8 py-12 max-w-sm w-full mx-4 transition-all duration-200 ${animating ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
      >
        {/* Icon */}
        <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-6xl">
          {current.icon}
        </div>

        {/* Text */}
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-black text-white leading-tight">{current.title}</h1>
          <p className="text-white/50 text-sm leading-relaxed">{current.sub}</p>
        </div>

        {/* Arrow animation on step 2 */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-1 text-amber-400 animate-bounce">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
            <svg className="w-6 h-6 -mt-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={goNext}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-[#080c14] font-black text-base rounded-2xl transition-all shadow-lg shadow-amber-900/30"
          >
            {current.btnPrimary}
          </button>
          {current.btnSecondary && (
            <button
              onClick={handleSecondary}
              className="w-full py-2.5 text-white/30 hover:text-white/60 text-sm transition-colors"
            >
              {current.btnSecondary}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
