"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";
import { PAYOUT_RATE } from "@/lib/constants";
import { ALL_ASSETS } from "@/lib/constants";
import type { Trade } from "@/types/trade";

interface Props {
  trades: Trade[];
  currentPrices: Record<string, { price: number }>;
}

function TradeRow({ trade, currentPrices }: { trade: Trade; currentPrices: Record<string, { price: number }> }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.ceil((new Date(trade.expiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    const iv = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((new Date(trade.expiresAt).getTime() - Date.now()) / 1000)));
    }, 500);
    return () => clearInterval(iv);
  }, [trade.expiresAt]);

  const currentPrice = currentPrices[trade.asset]?.price ?? trade.entryPrice;
  const entry = trade.entryPrice || 1;
  const isWinning =
    (trade.direction === "UP"   && currentPrice > entry) ||
    (trade.direction === "DOWN" && currentPrice < entry);
  const pnl     = isWinning ? trade.amount * PAYOUT_RATE : -trade.amount;
  const pct     = ((currentPrice - entry) / entry) * 100;
  const urgency = remaining <= 10 ? "text-rose-400" : remaining <= 30 ? "text-amber-400" : "text-slate-400";

  const assetInfo = ALL_ASSETS.find((a) => a.symbol === trade.asset);
  const isForex   = assetInfo?.type === "forex";

  return (
    <tr className="border-b border-[#1e2a42]/50 hover:bg-[#111827]/60 transition-colors group">
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isForex ? "bg-blue-400" : "bg-amber-400"} group-hover:animate-pulse`} />
          <span className="text-xs font-semibold text-white">{trade.asset}</span>
        </div>
      </td>
      <td className="px-4 py-2">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
          trade.direction === "UP"
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-rose-500/15 text-rose-400"
        }`}>
          {trade.direction === "UP" ? "▲ COMPRA" : "▼ VENDA"}
        </span>
      </td>
      <td className={`px-4 py-2 text-xs font-mono font-semibold tabular-nums ${urgency}`}>
        {remaining > 0 ? `${remaining}s` : "—"}
      </td>
      <td className="px-4 py-2 text-xs text-white font-mono">${trade.amount.toFixed(2)}</td>
      <td className="px-4 py-2 text-xs text-slate-400 font-mono">{formatPrice(entry, trade.asset)}</td>
      <td className="px-4 py-2 text-xs font-mono">
        <span className={isWinning ? "text-emerald-400" : "text-rose-400"}>
          {formatPrice(currentPrice, trade.asset)}
          <span className="text-[9px] ml-1 opacity-60">({pct >= 0 ? "+" : ""}{pct.toFixed(3)}%)</span>
        </span>
      </td>
      <td className="px-4 py-2">
        <span className={`text-xs font-bold font-mono ${isWinning ? "text-emerald-400" : "text-rose-400"}`}>
          {pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`}
        </span>
      </td>
    </tr>
  );
}

const COLUMNS = ["Ativo", "Tipo", "Expira", "Invest.", "Abertura", "Preço Atual", "P/L Esperado"];

export default function PositionsTable({ trades, currentPrices }: Props) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <p className="text-slate-600 text-xs">Nenhuma operação aberta.</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b border-[#1e2a42]">
            {COLUMNS.map((col) => (
              <th key={col} className="px-4 py-1.5 text-left text-[9px] font-semibold text-slate-600 uppercase tracking-widest whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <TradeRow key={trade.id} trade={trade} currentPrices={currentPrices} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
