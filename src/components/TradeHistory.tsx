"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { ASSETS } from "@/lib/constants";

interface Trade {
  id: string;
  asset: string;
  direction: string;
  amount: number;
  entryPrice: number;
  exitPrice: number | null;
  result: string;
  profit: number;
  createdAt: string;
}

type SortKey = "time" | "profit" | "amount";

interface Props {
  trades: Trade[];
  loading?: boolean;
}

export default function TradeHistory({ trades, loading }: Props) {
  const [filterAsset, setFilterAsset] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("time");

  const settled = trades.filter((t) => t.result !== "PENDING");

  const filtered =
    filterAsset === "all" ? settled : settled.filter((t) => t.asset === filterAsset);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "profit") {
      const aVal = a.result === "WIN" ? a.profit : -a.amount;
      const bVal = b.result === "WIN" ? b.profit : -b.amount;
      return bVal - aVal;
    }
    if (sortBy === "amount") return b.amount - a.amount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg p-3 border border-gray-800 animate-pulse">
            <div className="h-3 w-3/4 bg-gray-800 rounded mb-2" />
            <div className="h-2 w-1/2 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (settled.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <div className="text-3xl">🕐</div>
        <p className="text-gray-600 text-sm text-center">
          Nenhuma operação finalizada ainda.
        </p>
      </div>
    );
  }

  const usedAssets = [...new Set(settled.map((t) => t.asset))];

  return (
    <div className="space-y-2">
      {/* Filters */}
      <div className="flex items-center gap-1.5 flex-wrap pb-1">
        <div className="flex gap-1 flex-wrap flex-1">
          <button
            onClick={() => setFilterAsset("all")}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              filterAsset === "all"
                ? "bg-blue-500/20 text-blue-400"
                : "text-gray-600 hover:text-gray-400"
            }`}
          >
            Todos
          </button>
          {usedAssets.map((a) => (
            <button
              key={a}
              onClick={() => setFilterAsset(a)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                filterAsset === a
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-gray-600 hover:text-gray-400"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="bg-[#0e1117] border border-gray-800 rounded text-[10px] text-gray-500 px-1.5 py-0.5 focus:outline-none"
        >
          <option value="time">Recente</option>
          <option value="profit">Resultado</option>
          <option value="amount">Valor</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <p className="text-gray-700 text-xs text-center py-4">
          Nenhuma operação para {filterAsset}
        </p>
      ) : (
        sorted.map((trade) => {
          const won = trade.result === "WIN";
          return (
            <div
              key={trade.id}
              className={`rounded-lg p-3 border ${
                won
                  ? "bg-green-500/5 border-green-500/20"
                  : "bg-red-500/5 border-red-500/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold ${
                      won ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {won ? "✓ GANHOU" : "✗ PERDEU"}
                  </span>
                  <span className="text-gray-400 text-xs">{trade.asset}</span>
                  <span
                    className={`text-xs ${
                      trade.direction === "UP" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {trade.direction === "UP" ? "▲" : "▼"}
                  </span>
                </div>
                <span
                  className={`text-sm font-semibold font-mono ${
                    won ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {won
                    ? `+$${trade.profit.toFixed(2)}`
                    : `-$${trade.amount.toFixed(2)}`}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                <span>${formatPrice(trade.entryPrice, trade.asset)}</span>
                <span>→</span>
                <span>${formatPrice(trade.exitPrice ?? 0, trade.asset)}</span>
                <span className="text-gray-700 mx-1">·</span>
                <span className="text-gray-600">${trade.amount.toFixed(2)}</span>
                <span className="ml-auto">
                  {new Date(trade.createdAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
