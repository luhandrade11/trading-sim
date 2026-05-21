"use client";

import { useEffect, useRef, useState } from "react";
import type { Trade } from "@/types/trade";

interface Props {
  trades: Trade[];
  currentPrices: Record<string, { price: number }>;
  onSettle: (id: string, exitPrice: number) => void;
  loading?: boolean;
}

function CountdownBadge({
  tradeId, duration, expiresAt, asset, currentPrices, onSettle,
}: {
  tradeId: string;
  duration: number;
  expiresAt: string;
  asset: string;
  currentPrices: Record<string, { price: number }>;
  onSettle: (id: string, exitPrice: number) => void;
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );
  const settledRef = useRef(false);
  const retriesRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const secs    = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000);
      const clamped = Math.max(0, secs);
      setRemaining(clamped);

      if (clamped <= 0 && !settledRef.current) {
        const exitPrice = currentPrices[asset]?.price ?? 0;
        if (exitPrice > 0) {
          settledRef.current = true;
          clearInterval(interval);
          onSettle(tradeId, exitPrice);
        } else if (retriesRef.current < 10) {
          retriesRef.current++;
        } else {
          settledRef.current = true;
          clearInterval(interval);
        }
      }
    }, 500);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId, expiresAt]);

  const pct       = Math.max(0, Math.min(100, (remaining / duration) * 100));
  const isUrgent  = pct <= 15;
  const isWarning = pct <= 40 && !isUrgent;

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1 bg-[#1e2a42] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isUrgent ? "bg-rose-500" : isWarning ? "bg-amber-400" : "bg-emerald-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-mono tabular-nums w-7 text-right ${
        isUrgent ? "text-rose-400" : isWarning ? "text-amber-400" : "text-slate-400"
      }`}>
        {remaining}s
      </span>
    </div>
  );
}

export default function ActiveTrades({ trades, currentPrices, onSettle, loading }: Props) {
  const settlingRef = useRef<Set<string>>(new Set());

  const handleSettle = (id: string, exitPrice: number) => {
    if (settlingRef.current.has(id)) return;
    settlingRef.current.add(id);
    onSettle(id, exitPrice);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl p-3 border border-[#1e2a42] shimmer h-16" />
        ))}
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#111827] border border-[#1e2a42] flex items-center justify-center">
          <span className="text-xl">📊</span>
        </div>
        <div className="text-center">
          <p className="text-slate-500 text-sm font-medium">Nenhuma operação ativa</p>
          <p className="text-slate-700 text-xs mt-0.5">Escolha um ativo e aposte!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {trades.map((trade) => {
        const currentPrice = currentPrices[trade.asset]?.price ?? trade.entryPrice;
        const entryPrice   = trade.entryPrice || 1;
        const isWinning    =
          (trade.direction === "UP"   && currentPrice > entryPrice) ||
          (trade.direction === "DOWN" && currentPrice < entryPrice);
        const priceDiff    = ((currentPrice - entryPrice) / entryPrice) * 100;

        return (
          <div
            key={trade.id}
            className={`rounded-xl p-3 border transition-colors ${
              isWinning
                ? "bg-emerald-500/5 border-emerald-500/15"
                : "bg-rose-500/5 border-rose-500/15"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-white text-xs font-semibold">{trade.asset}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                  trade.direction === "UP"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-rose-500/15 text-rose-400"
                }`}>
                  {trade.direction === "UP" ? "▲ CIMA" : "▼ BAIXO"}
                </span>
              </div>
              <span className={`text-xs font-bold font-mono ${isWinning ? "text-emerald-400" : "text-rose-400"}`}>
                {priceDiff >= 0 ? "+" : ""}{priceDiff.toFixed(3)}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-[10px] text-slate-600">
                <span className="text-slate-500 font-mono">
                  ${entryPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
                <span className="mx-1 text-slate-700">·</span>
                <span className="text-white font-semibold">${trade.amount.toFixed(2)}</span>
              </div>
              <CountdownBadge
                tradeId={trade.id}
                duration={trade.duration}
                expiresAt={trade.expiresAt}
                asset={trade.asset}
                currentPrices={currentPrices}
                onSettle={handleSettle}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
