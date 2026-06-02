"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";

interface AssetInfo {
  symbol: string;
  name: string;
  type: "crypto" | "forex";
}

interface Props {
  assets: AssetInfo[];
  openAssets: string[];
  selectedAsset?: string;
  prices: Record<string, { price: number; change24h: number }>;
  onAdd: (symbol: string) => void;
  onRemove: (symbol: string) => void;
  onSelect?: (symbol: string) => void;
  onClose: () => void;
}

function AssetRow({
  asset,
  price,
  change24h,
  isOpen,
  isSelected,
  onToggle,
  onSelect,
}: {
  asset: AssetInfo;
  price: number;
  change24h: number;
  isOpen: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect?: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 border-b border-[#1e2a42]/30 last:border-0 transition-colors ${
        isSelected ? "bg-amber-400/5 border-l-2 border-l-amber-400" : "hover:bg-[#111827]/70"
      }`}
    >
      {/* Left — clickable for switching */}
      <button
        onClick={onSelect}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
        disabled={!onSelect}
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${asset.type === "crypto" ? "bg-amber-400" : "bg-blue-400"}`} />
        <div className="min-w-0">
          <div className={`text-xs font-bold ${isSelected ? "text-amber-400" : "text-white"}`}>{asset.symbol}</div>
          <div className="text-slate-600 text-[10px] truncate">{asset.name}</div>
        </div>
      </button>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right min-w-[72px]">
          <div className="text-white text-xs font-mono">
            {price > 0 ? `$${formatPrice(price, asset.symbol)}` : <span className="text-slate-700">—</span>}
          </div>
          {change24h !== 0 ? (
            <div className={`text-[10px] ${change24h >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
            </div>
          ) : (
            <div className="text-[10px] text-slate-700">—</div>
          )}
        </div>

        {/* On mobile with onSelect: show compact toggle. On desktop: show full label */}
        {onSelect ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            title={isOpen ? "Remover" : "Adicionar"}
            className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
              isOpen
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
                : "bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20"
            }`}
          >
            {isOpen ? "−" : "+"}
          </button>
        ) : (
          <button
            onClick={onToggle}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
              isOpen
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
                : "bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20"
            }`}
          >
            {isOpen ? "− Remover" : "+ Adicionar"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AssetPicker({
  assets,
  openAssets,
  selectedAsset,
  prices,
  onAdd,
  onRemove,
  onSelect,
  onClose,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = assets.filter(
    (a) =>
      a.symbol.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase())
  );

  const crypto = filtered.filter((a) => a.type === "crypto");
  const forex  = filtered.filter((a) => a.type === "forex");

  function handleSelect(symbol: string) {
    if (!onSelect) return;
    if (!openAssets.includes(symbol)) onAdd(symbol);
    onSelect(symbol);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-[#080c14]/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-[#0c1018] border border-[#1e2a42] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg card-shadow overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2a42] shrink-0">
          <div>
            <h2 className="text-white font-bold text-sm">
              {onSelect ? "Selecionar Ativo" : "Gerenciar Ativos"}
            </h2>
            <p className="text-slate-600 text-[10px] mt-0.5">
              {onSelect
                ? "Toque no ativo para negociar"
                : `${openAssets.length} abertos · ${assets.length} disponíveis`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1.5 hover:bg-white/5 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-[#1e2a42] shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar símbolo ou nome…"
              className="w-full bg-[#0d1117] border border-[#1e2a42] rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-slate-700 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/15 transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Asset list */}
        <div className="overflow-y-auto flex-1">

          {crypto.length > 0 && (
            <div>
              <div className="px-5 py-2 bg-[#080c14]/60 sticky top-0 z-10">
                <span className="text-[9px] font-bold text-amber-400/70 uppercase tracking-widest">
                  ◆ Criptomoedas — {crypto.length}
                </span>
              </div>
              {crypto.map((asset) => {
                const p = prices[asset.symbol];
                return (
                  <AssetRow
                    key={asset.symbol}
                    asset={asset}
                    price={p?.price ?? 0}
                    change24h={p?.change24h ?? 0}
                    isOpen={openAssets.includes(asset.symbol)}
                    isSelected={selectedAsset === asset.symbol}
                    onToggle={() =>
                      openAssets.includes(asset.symbol)
                        ? onRemove(asset.symbol)
                        : onAdd(asset.symbol)
                    }
                    onSelect={onSelect ? () => handleSelect(asset.symbol) : undefined}
                  />
                );
              })}
            </div>
          )}

          {forex.length > 0 && (
            <div>
              <div className="px-5 py-2 bg-[#080c14]/60 sticky top-0 z-10">
                <span className="text-[9px] font-bold text-blue-400/70 uppercase tracking-widest">
                  ◆ Forex — {forex.length}
                </span>
              </div>
              {forex.map((asset) => {
                const p = prices[asset.symbol];
                return (
                  <AssetRow
                    key={asset.symbol}
                    asset={asset}
                    price={p?.price ?? 0}
                    change24h={p?.change24h ?? 0}
                    isOpen={openAssets.includes(asset.symbol)}
                    isSelected={selectedAsset === asset.symbol}
                    onToggle={() =>
                      openAssets.includes(asset.symbol)
                        ? onRemove(asset.symbol)
                        : onAdd(asset.symbol)
                    }
                    onSelect={onSelect ? () => handleSelect(asset.symbol) : undefined}
                  />
                );
              })}
            </div>
          )}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-slate-600 text-sm">Nenhum ativo encontrado</p>
              <p className="text-slate-700 text-xs">Tente outro símbolo ou nome</p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-[#1e2a42] shrink-0">
          <p className="text-slate-700 text-[10px] text-center">
            {onSelect
              ? "Toque no nome do ativo para começar a negociar · + / − para gerenciar lista"
              : "Pelo menos 1 ativo deve estar aberto na barra de negociação"}
          </p>
        </div>
      </div>
    </div>
  );
}
