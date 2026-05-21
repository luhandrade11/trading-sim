"use client";

import { useEffect, useRef, useState } from "react";

interface Trade {
  id: string;
  asset: string;
  direction: string;
  amount: number;
  entryPrice: number;
  duration: number;
  expiresAt: string;
}

interface Props {
  trades: Trade[];
  currentPrices: Record<string, { price: number }>;
  onSettle: (id: string, exitPrice: number) => void;
}

function CountdownBadge({
  tradeId,
  duration,
  expiresAt,
  asset,
  currentPrices,
  onSettle,
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

  useEffect(() => {
    const interval = setInterval(() => {
      const secs = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000);
      const clamped = Math.max(0, secs);
      setRemaining(clamped);

      if (clamped <= 0 && !settledRef.current) {
        settledRef.current = true;
        clearInterval(interval);
        const exitPrice = currentPrices[asset]?.price ?? 0;
        if (exitPrice > 0) {
          onSettle(tradeId, exitPrice);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId, expiresAt]);

  const pct = Math.max(0, Math.min(100, (remaining / duration) * 100));
  const color = pct > 40 ? "bg-green-400" : pct > 15 ? "bg-yellow-400" : "bg-red-400";

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-yellow-400 text-xs font-mono tabular-nums w-8 text-right">
        {remaining}s
      </span>
    </div>
  );
}

export default function ActiveTrades({ trades, currentPrices, onSettle }: Props) {
  const settlingRef = useRef<Set<string>>(new Set());

  const handleSettle = (id: string, exitPrice: number) => {
    if (settlingRef.current.has(id)) return;
    settlingRef.current.add(id);
    onSettle(id, exitPrice);
  };

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <div className="text-3xl">📊</div>
        <p className="text-gray-600 text-sm text-center">
          Nenhuma operação ativa.<br />
          <span className="text-gray-700">Escolha um ativo e aposte!</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {trades.map((trade) => {
        const currentPrice = currentPrices[trade.asset]?.price ?? trade.entryPrice;
        const isWinning =
          (trade.direction === "UP" && currentPrice > trade.entryPrice) ||
          (trade.direction === "DOWN" && currentPrice < trade.entryPrice);
        const priceDiff = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;

        return (
          <div key={trade.id} className="bg-[#0e1117] rounded-lg p-3 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-medium">{trade.asset}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-semibold ${
                    trade.direction === "UP"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {trade.direction === "UP" ? "▲ CIMA" : "▼ BAIXO"}
                </span>
              </div>
              <span
                className={`text-xs font-semibold ${isWinning ? "text-green-400" : "text-red-400"}`}
              >
                {priceDiff >= 0 ? "+" : ""}
                {priceDiff.toFixed(3)}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                <span className="text-gray-400">
                  ${trade.entryPrice.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </span>
                {" · "}
                <span className="text-white font-medium">${trade.amount.toFixed(2)}</span>
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
