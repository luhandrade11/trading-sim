"use client";

import { useEffect } from "react";
import { formatCurrency } from "@/lib/i18n";

interface Props {
  profit: number;
  asset:  string;
  onDeposit: () => void;
  onClose:   () => void;
  locale: string;
}

const LABELS: Record<string, { title: string; sub: string; depositBtn: string; continueLink: string }> = {
  "pt-BR": { title: "VOCÊ GANHOU!",    sub: "Operação encerrada com lucro",  depositBtn: "Depositar Mais",      continueLink: "Continuar Operando" },
  "en-US": { title: "YOU WON!",        sub: "Trade closed with profit",       depositBtn: "Deposit More",        continueLink: "Keep Trading" },
  "es-ES": { title: "¡GANASTE!",       sub: "Operación cerrada con ganancia", depositBtn: "Depositar Más",       continueLink: "Seguir Operando" },
  "fr-FR": { title: "VOUS AVEZ GAGNÉ!", sub: "Opération clôturée avec profit", depositBtn: "Déposer Plus",       continueLink: "Continuer à Trader" },
  "de-DE": { title: "SIE HABEN GEWONNEN!", sub: "Trade mit Gewinn abgeschlossen", depositBtn: "Mehr Einzahlen", continueLink: "Weiterhandeln" },
  "ja-JP": { title: "勝利！",           sub: "トレードが利益で終了",             depositBtn: "もっと入金する",      continueLink: "トレードを続ける" },
};

export default function PostWinPopup({ profit, asset, onDeposit, onClose, locale }: Props) {
  const labels = LABELS[locale] ?? LABELS["pt-BR"];

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Confetti particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-sm opacity-80"
            style={{
              left:             `${5 + (i * 4.7) % 90}%`,
              top:              `-${10 + (i * 7) % 20}px`,
              background:       ["#f59e0b","#10b981","#6366f1","#ec4899","#f97316","#22d3ee"][i % 6],
              animation:        `confetti-fall ${1.5 + (i % 5) * 0.4}s ease-in ${(i % 7) * 0.15}s both`,
              transform:        `rotate(${i * 37}deg)`,
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div
        className="result-anim relative z-10 flex flex-col items-center gap-6 p-8 rounded-3xl border border-amber-400/30 text-center max-w-xs w-full mx-4"
        style={{ background: "linear-gradient(145deg, #0f1a0a 0%, #0a1a0e 50%, #0d1a06 100%)" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
        >
          ✕
        </button>

        {/* Trophy */}
        <div className="w-20 h-20 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-5xl">
          🏆
        </div>

        {/* Title */}
        <div>
          <div className="text-2xl font-black text-amber-400 tracking-wide">{labels.title}</div>
          <div className="text-white/40 text-xs mt-1">{labels.sub}</div>
        </div>

        {/* Profit */}
        <div className="flex flex-col items-center gap-1">
          <div className="text-5xl font-black text-emerald-400">
            +{formatCurrency(profit)}
          </div>
          <div className="text-white/30 text-xs font-mono">{asset}</div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onDeposit}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-[#080c14] font-black text-sm rounded-2xl transition-all shadow-lg shadow-amber-900/30"
          >
            💰 {labels.depositBtn}
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            {labels.continueLink}
          </button>
        </div>
      </div>
    </div>
  );
}
