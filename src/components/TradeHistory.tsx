"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import type { Trade } from "@/types/trade";

type SortKey = "time" | "profit" | "amount";

interface Props {
  trades: Trade[];
  loading?: boolean;
}

const PAGE_SIZE = 20;

export default function TradeHistory({ trades, loading }: Props) {
  const [filterAsset, setFilterAsset] = useState<string>("all");
  const [sortBy, setSortBy]           = useState<SortKey>("time");
  const [page, setPage]               = useState(1);

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

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated  = sorted.slice(0, page * PAGE_SIZE);
  const hasMore    = page < totalPages;

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-[#1e2a42] shimmer h-14" />
        ))}
      </div>
    );
  }

  if (settled.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#111827] border border-[#1e2a42] flex items-center justify-center">
          <span className="text-xl">🕐</span>
        </div>
        <div className="text-center">
          <p className="text-slate-500 text-sm font-medium">Nenhuma operação finalizada</p>
          <p className="text-slate-700 text-xs mt-0.5">Suas operações aparecerão aqui</p>
        </div>
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
            onClick={() => { setFilterAsset("all"); setPage(1); }}
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
              filterAsset === "all" ? "bg-amber-400/15 text-amber-400" : "text-slate-600 hover:text-slate-400"
            }`}
          >
            Todos
          </button>
          {usedAssets.map((a) => (
            <button key={a} onClick={() => { setFilterAsset(a); setPage(1); }}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                filterAsset === a ? "bg-amber-400/15 text-amber-400" : "text-slate-600 hover:text-slate-400"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value as SortKey); setPage(1); }}
          className="bg-[#0d1117] border border-[#1e2a42] rounded-lg text-[10px] text-slate-500 px-1.5 py-0.5 focus:outline-none"
        >
          <option value="time">Recente</option>
          <option value="profit">Resultado</option>
          <option value="amount">Valor</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <p className="text-slate-700 text-xs text-center py-4">Nenhuma operação para {filterAsset}</p>
      ) : (
        <>
          <div className="space-y-2">
            {paginated.map((trade) => {
              const won = trade.result === "WIN";
              return (
                <div key={trade.id} className={`rounded-xl p-3 border ${
                  won ? "bg-emerald-500/5 border-emerald-500/15" : "bg-rose-500/5 border-rose-500/15"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        won ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                      }`}>
                        {won ? "✓ GANHOU" : "✗ PERDEU"}
                      </span>
                      <span className="text-slate-400 text-[10px]">{trade.asset}</span>
                      <span className={`text-[10px] ${trade.direction === "UP" ? "text-emerald-400" : "text-rose-400"}`}>
                        {trade.direction === "UP" ? "▲" : "▼"}
                      </span>
                    </div>
                    <span className={`text-sm font-bold font-mono ${won ? "text-emerald-400" : "text-rose-400"}`}>
                      {won ? `+$${trade.profit.toFixed(2)}` : `-$${trade.amount.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-700">
                    <span className="font-mono">${formatPrice(trade.entryPrice, trade.asset)}</span>
                    <span className="text-slate-800">→</span>
                    <span className="font-mono">${formatPrice(trade.exitPrice ?? 0, trade.asset)}</span>
                    <span className="text-slate-800 mx-0.5">·</span>
                    <span className="text-slate-600">${trade.amount.toFixed(2)}</span>
                    <span className="ml-auto text-slate-600">
                      {new Date(trade.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="w-full py-2 text-[10px] text-slate-600 hover:text-slate-400 border border-[#1e2a42] hover:border-[#2d4070] rounded-xl transition-colors mt-1"
            >
              Carregar mais ({sorted.length - paginated.length} restantes)
            </button>
          )}

          <p className="text-[9px] text-slate-700 text-center pt-1">
            {paginated.length} de {sorted.length} operações
          </p>
        </>
      )}
    </div>
  );
}
