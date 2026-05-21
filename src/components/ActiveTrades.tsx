"use client";

import { useEffect, useState } from "react";

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
  expiresAt,
  tradeId,
  asset,
  currentPrices,
  onSettle,
}: {
  expiresAt: string;
  tradeId: string;
  asset: string;
  currentPrices: Record<string, { price: number }>;
  onSettle: (id: string, exitPrice: number) => void;
}) {
  const [remaining, setRemaining] = useState(
    Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (remaining <= 0 || settled) return;

    const interval = setInterval(() => {
      const secs = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000);
      setRemaining(Math.max(0, secs));

      if (secs <= 0 && !settled) {
        setSettled(true);
        const exitPrice = currentPrices[asset]?.price ?? 0;
        onSettle(tradeId, exitPrice);
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [expiresAt, tradeId, asset, currentPrices, onSettle, settled, remaining]);

  const total = Math.ceil(
    (new Date(expiresAt).getTime() -
      (new Date(expiresAt).getTime() - remaining * 1000 - (Date.now() - new Date(expiresAt).getTime() + remaining * 1000))) /
      1000
  );

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all"
          style={{ width: `${(remaining / (total || 1)) * 100}%` }}
        />
      </div>
      <span className="text-yellow-400 text-xs font-mono tabular-nums">{remaining}s</span>
    </div>
  );
}

export default function ActiveTrades({ trades, currentPrices, onSettle }: Props) {
  const [settling, setSettling] = useState<Set<string>>(new Set());

  const handleSettle = (id: string, exitPrice: number) => {
    if (settling.has(id)) return;
    setSettling((s) => new Set([...s, id]));
    onSettle(id, exitPrice);
  };

  if (trades.length === 0) {
    return (
      <div className="text-center text-gray-600 text-sm py-6">
        Nenhuma operação ativa
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
              <span className={`text-xs font-medium ${isWinning ? "text-green-400" : "text-red-400"}`}>
                {priceDiff >= 0 ? "+" : ""}
                {priceDiff.toFixed(3)}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Entrada:{" "}
                <span className="text-gray-300">
                  ${trade.entryPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
                {" · "}
                <span className="text-white">${trade.amount.toFixed(2)}</span>
              </div>
              <CountdownBadge
                expiresAt={trade.expiresAt}
                tradeId={trade.id}
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
