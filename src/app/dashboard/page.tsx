"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ActiveTrades from "@/components/ActiveTrades";
import TradeHistory from "@/components/TradeHistory";
import ConfirmModal from "@/components/ConfirmModal";
import { PAYOUT_RATE, ASSETS, DURATIONS } from "@/lib/constants";
import { computeStats, formatPrice } from "@/lib/utils";

const TradingChart = dynamic(() => import("@/components/TradingChart"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0e1117]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-600 text-xs">Carregando gráfico…</span>
      </div>
    </div>
  ),
});

interface PriceData { price: number; change24h: number }
interface Trade {
  id: string; asset: string; direction: string; amount: number;
  entryPrice: number; exitPrice: number | null; duration: number;
  result: string; profit: number; createdAt: string; expiresAt: string;
}
interface Notification { msg: string; type: "win" | "loss" | "error"; key: number }

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [selectedAsset, setSelectedAsset] = useState<string>(ASSETS[0]);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [amount, setAmount] = useState(10);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [pricesStale, setPricesStale] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [showPanel, setShowPanel] = useState(false);
  const [prevPrice, setPrevPrice] = useState(0);
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPriceUpdateRef = useRef(0);

  const activeTrades = trades.filter((t) => t.result === "PENDING");
  const stats = computeStats(trades);
  const currentPrice = prices[selectedAsset]?.price ?? 0;
  const change24h = prices[selectedAsset]?.change24h ?? 0;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const showNotif = useCallback((msg: string, type: Notification["type"]) => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setNotification({ msg, type, key: Date.now() });
    notifTimerRef.current = setTimeout(() => setNotification(null), 5000);
  }, []);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/prices");
      if (!res.ok) return;
      const data = await res.json();
      setPrices((prev) => {
        const prevVal = prev[selectedAsset]?.price ?? 0;
        const newVal = data[selectedAsset]?.price ?? 0;
        if (newVal > 0 && prevVal > 0 && newVal !== prevVal) {
          setPriceFlash(newVal > prevVal ? "up" : "down");
          setTimeout(() => setPriceFlash(null), 600);
        }
        setPrevPrice(prevVal);
        return data;
      });
      lastPriceUpdateRef.current = Date.now();
      setPricesStale(false);

      // Mark stale if no update in 30s
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
      staleTimerRef.current = setTimeout(() => setPricesStale(true), 30000);
    } catch {
      // prices stay as-is
    }
  }, [selectedAsset]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/user");
      if (res.ok) setBalance((await res.json()).balance);
    } catch {}
  }, []);

  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch("/api/trades");
      if (res.ok) {
        setTrades(await res.json());
        setTradesLoading(false);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchPrices();
    fetchUser();
    fetchTrades();

    const priceInterval = setInterval(fetchPrices, 5000);
    const dataInterval = setInterval(() => { fetchUser(); fetchTrades(); }, 15000);
    return () => {
      clearInterval(priceInterval);
      clearInterval(dataInterval);
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    };
  }, [status, fetchPrices, fetchUser, fetchTrades]);

  const handleSettle = useCallback(async (id: string, exitPrice: number) => {
    try {
      const res = await fetch(`/api/trades/${id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exitPrice }),
      });
      if (res.ok) {
        const settled = await res.json();
        setTrades((prev) => prev.map((t) => (t.id === id ? { ...t, ...settled } : t)));
        await fetchUser();
        if (settled.result === "WIN") {
          showNotif(`🏆 Ganhou! +$${settled.profit.toFixed(2)}`, "win");
        } else {
          showNotif(`💸 Perdeu -$${settled.amount.toFixed(2)}`, "loss");
        }
        setActiveTab("history");
      } else {
        showNotif("Erro ao finalizar operação", "error");
      }
    } catch {
      showNotif("Erro de conexão ao finalizar", "error");
    }
  }, [fetchUser, showNotif]);

  async function placeTrade(direction: "UP" | "DOWN") {
    if (!currentPrice || placing) return;
    if (balance === null) { showNotif("Aguarde o saldo carregar", "error"); return; }
    if (amount > balance) { showNotif("Saldo insuficiente", "error"); return; }
    if (amount < 1) { showNotif("Valor mínimo: $1.00", "error"); return; }

    setPlacing(true);
    try {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset: selectedAsset, direction, amount, entryPrice: currentPrice, duration: selectedDuration }),
      });
      if (res.ok) {
        const trade = await res.json();
        setTrades((prev) => [trade, ...prev]);
        setBalance((b) => (b !== null ? b - amount : null));
        setActiveTab("active");
      } else {
        const data = await res.json();
        showNotif(data.error ?? "Erro ao abrir operação", "error");
      }
    } catch {
      showNotif("Erro de conexão", "error");
    } finally {
      setPlacing(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch("/api/user/reset", { method: "POST" });
      if (res.ok) {
        setBalance(1000);
        setTrades([]);
        showNotif("✓ Saldo resetado para $1.000", "win");
      } else {
        showNotif("Erro ao resetar saldo", "error");
      }
    } catch {
      showNotif("Erro de conexão ao resetar", "error");
    } finally {
      setResetting(false);
      setResetModalOpen(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0e1117] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const balanceDisplay =
    balance === null
      ? "…"
      : `$${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const canTrade = currentPrice > 0 && !placing && balance !== null && balance >= amount && amount >= 1;

  return (
    <div className="min-h-screen bg-[#0e1117] flex flex-col">
      {/* Navbar */}
      <header className="h-12 bg-[#161b22] border-b border-gray-800 flex items-center px-3 gap-3 shrink-0 z-10">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
            <span className="text-black font-bold text-xs">T</span>
          </div>
          <span className="text-white font-semibold text-sm hidden sm:block">TradeSim</span>
        </div>

        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide flex-1">
          {ASSETS.map((asset) => {
            const p = prices[asset];
            return (
              <button
                key={asset}
                onClick={() => setSelectedAsset(asset)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                  selectedAsset === asset
                    ? "bg-green-500/20 text-green-400"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                <span>{asset}</span>
                {p?.price ? (
                  <span className={`hidden md:block font-mono text-[10px] ${(p.change24h ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {p.change24h >= 0 ? "+" : ""}{p.change24h.toFixed(1)}%
                  </span>
                ) : (
                  <span className="hidden md:block text-[10px] text-gray-700 animate-pulse">…</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-gray-600 uppercase tracking-wide">Saldo</div>
            <div className={`text-sm font-bold font-mono ${balance === null ? "text-gray-600 animate-pulse" : "text-white"}`}>
              {balanceDisplay}
            </div>
          </div>

          <button
            onClick={() => setShowPanel((v) => !v)}
            className="md:hidden p-1.5 text-gray-400 hover:text-white transition-colors"
            aria-label="Painel de trading"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </button>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Toast */}
      <div className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        notification ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"
      }`}>
        {notification && (
          <div key={notification.key} className={`px-5 py-2.5 rounded-lg font-semibold text-sm shadow-xl whitespace-nowrap ${
            notification.type === "win" ? "bg-green-500 text-black"
            : notification.type === "loss" ? "bg-red-500 text-white"
            : "bg-yellow-500 text-black"
          }`}>
            {notification.msg}
          </div>
        )}
      </div>

      {/* Confirm modal */}
      <ConfirmModal
        open={resetModalOpen}
        title="Resetar saldo"
        message="Isso vai apagar todo o histórico de operações e restaurar o saldo para $1.000. Esta ação não pode ser desfeita."
        confirmLabel={resetting ? "Resetando…" : "Resetar"}
        danger
        onConfirm={handleReset}
        onCancel={() => setResetModalOpen(false)}
      />

      {/* Main */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Chart */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Price bar */}
          <div className="h-14 bg-[#161b22] border-b border-gray-800 flex items-center px-4 gap-4 shrink-0">
            <div className={`transition-colors duration-300 ${
              priceFlash === "up" ? "text-green-400" : priceFlash === "down" ? "text-red-400" : "text-white"
            }`}>
              <span className="text-xl font-bold font-mono">
                {currentPrice > 0 ? `$${formatPrice(currentPrice, selectedAsset)}` : "—"}
              </span>
            </div>

            {change24h !== 0 && (
              <div className={`text-sm font-medium ${change24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}% (24h)
              </div>
            )}

            {pricesStale && (
              <div className="flex items-center gap-1 text-[10px] text-yellow-600 bg-yellow-600/10 border border-yellow-600/20 rounded px-2 py-0.5">
                <span>⚠</span> preço estimado
              </div>
            )}

            {currentPrice > 0 && prevPrice > 0 && (
              <div className="text-xs text-gray-600 ml-auto hidden sm:block">
                ant.: <span className="text-gray-500 font-mono">${formatPrice(prevPrice, selectedAsset)}</span>
              </div>
            )}
          </div>

          {/* Chart area */}
          <div className="flex-1 p-2 min-h-0">
            {currentPrice > 0 ? (
              <TradingChart currentPrice={currentPrice} asset={selectedAsset} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-gray-700 border-t-green-500 rounded-full animate-spin" />
                  <span className="text-gray-700 text-xs">Carregando preço…</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className={`bg-[#161b22] border-l border-gray-800 flex flex-col shrink-0 w-full md:w-80 ${
          showPanel ? "absolute inset-0 md:relative z-20" : "hidden md:flex"
        }`}>
          {/* Mobile close */}
          <div className="md:hidden flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-xs text-gray-500 font-medium">Painel de Trading</span>
            <button onClick={() => setShowPanel(false)} className="text-gray-500 hover:text-white text-sm p-1">✕</button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-px bg-gray-800 border-b border-gray-800 shrink-0">
            <div className="bg-[#161b22] px-2 py-2.5 text-center">
              <div className="text-[9px] text-gray-600 uppercase tracking-wide mb-0.5">Win Rate</div>
              <div className={`text-sm font-bold ${
                stats.winRate >= 50 ? "text-green-400" : stats.winRate > 0 ? "text-red-400" : "text-gray-600"
              }`}>
                {stats.settled === 0 ? "—" : `${stats.winRate.toFixed(0)}%`}
              </div>
            </div>
            <div className="bg-[#161b22] px-2 py-2.5 text-center">
              <div className="text-[9px] text-gray-600 uppercase tracking-wide mb-0.5">P&L</div>
              <div className={`text-sm font-bold font-mono ${
                stats.pnl > 0 ? "text-green-400" : stats.pnl < 0 ? "text-red-400" : "text-gray-600"
              }`}>
                {stats.settled === 0 ? "—" : `${stats.pnl >= 0 ? "+" : ""}$${Math.abs(stats.pnl).toFixed(0)}`}
              </div>
            </div>
            <div className="bg-[#161b22] px-2 py-2.5 text-center">
              <div className="text-[9px] text-gray-600 uppercase tracking-wide mb-0.5">Streak</div>
              <div className={`text-sm font-bold ${
                stats.streakType === "WIN" ? "text-green-400" : stats.streakType === "LOSS" ? "text-red-400" : "text-gray-600"
              }`}>
                {stats.streak === 0 ? "—" : (
                  <span>
                    {stats.streakType === "WIN" ? "🔥" : "❄️"} {stats.streak}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sub-stats row */}
          {stats.settled > 0 && (
            <div className="flex items-center justify-around px-3 py-1.5 border-b border-gray-800 shrink-0">
              <span className="text-[10px] text-gray-600">
                <span className="text-green-500">{stats.wins}</span>W{" "}
                <span className="text-red-500">{stats.losses}</span>L
              </span>
              <span className="text-gray-800">|</span>
              <span className="text-[10px] text-gray-600">
                Invest.: <span className="text-gray-400">${stats.totalInvested.toFixed(0)}</span>
              </span>
              <span className="text-gray-800">|</span>
              <span className="text-[10px] text-gray-600">
                Ganho: <span className="text-green-600">${stats.totalProfit.toFixed(0)}</span>
              </span>
            </div>
          )}

          {/* Trading controls */}
          <div className="p-4 border-b border-gray-800 shrink-0">
            {/* Duration */}
            <div className="mb-3">
              <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-1.5">Tempo</div>
              <div className="grid grid-cols-4 gap-1">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setSelectedDuration(d.value)}
                    className={`py-1.5 rounded text-xs font-medium transition-colors ${
                      selectedDuration === d.value
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                        : "bg-[#0e1117] text-gray-500 border border-gray-800 hover:border-gray-600 hover:text-gray-300"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] text-gray-600 uppercase tracking-wide">Valor (USD)</div>
                {balance !== null && (
                  <div className="text-[10px] text-gray-700">
                    Disp.: <span className="text-gray-500 font-mono">${balance.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setAmount(Math.max(1, v));
                  }}
                  min={1}
                  max={balance ?? undefined}
                  className="flex-1 bg-[#0e1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500 font-mono"
                />
                <div className="flex gap-1">
                  {[25, 50, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setAmount(Math.max(1, Math.floor((balance ?? 0) * (pct / 100))))}
                      disabled={balance === null || balance < 1}
                      className="px-1.5 py-1.5 bg-[#0e1117] border border-gray-800 rounded text-[10px] text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors disabled:opacity-30"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
              {amount > (balance ?? 0) && balance !== null && (
                <p className="text-red-400 text-[10px] mt-1">Valor acima do saldo disponível</p>
              )}
            </div>

            {/* Payout */}
            <div className="bg-[#0e1117] rounded-lg px-3 py-2 mb-3 flex items-center justify-between">
              <span className="text-[10px] text-gray-600 uppercase tracking-wide">Retorno (acerto)</span>
              <span className="text-xs text-green-400 font-semibold font-mono">
                +${(amount * PAYOUT_RATE).toFixed(2)}{" "}
                <span className="text-green-700">({(PAYOUT_RATE * 100).toFixed(0)}%)</span>
              </span>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => placeTrade("UP")}
                disabled={!canTrade}
                className="py-3 rounded-lg bg-green-500 hover:bg-green-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm transition-all flex items-center justify-center gap-1.5"
              >
                <span className="text-base leading-none">▲</span> CIMA
              </button>
              <button
                onClick={() => placeTrade("DOWN")}
                disabled={!canTrade}
                className="py-3 rounded-lg bg-red-500 hover:bg-red-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all flex items-center justify-center gap-1.5"
              >
                <span className="text-base leading-none">▼</span> BAIXO
              </button>
            </div>
          </div>

          {/* Trades */}
          <div className="flex border-b border-gray-800 shrink-0">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === "active" ? "text-white border-b-2 border-green-500" : "text-gray-500 hover:text-gray-400"
              }`}
            >
              Ativas
              {activeTrades.length > 0 && (
                <span className="ml-1 bg-green-500/20 text-green-400 rounded-full px-1.5 py-0.5 text-[10px]">
                  {activeTrades.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === "history" ? "text-white border-b-2 border-green-500" : "text-gray-500 hover:text-gray-400"
              }`}
            >
              Histórico
              {stats.settled > 0 && (
                <span className="ml-1 text-gray-700 text-[10px]">({stats.settled})</span>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 min-h-0">
            {activeTab === "active" ? (
              <ActiveTrades
                trades={activeTrades}
                currentPrices={prices}
                onSettle={handleSettle}
                loading={tradesLoading}
              />
            ) : (
              <TradeHistory trades={trades} loading={tradesLoading} />
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-800 flex items-center justify-between shrink-0">
            <span className="text-xs text-gray-600 truncate max-w-[120px]">
              {session?.user?.name}
            </span>
            <button
              onClick={() => setResetModalOpen(true)}
              disabled={resetting}
              className="text-[10px] text-gray-700 hover:text-red-400 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              ↺ Resetar saldo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
