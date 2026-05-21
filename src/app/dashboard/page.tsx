"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ActiveTrades from "@/components/ActiveTrades";
import TradeHistory from "@/components/TradeHistory";
import { PAYOUT_RATE, ASSETS, DURATIONS } from "@/lib/constants";

const TradingChart = dynamic(() => import("@/components/TradingChart"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-600 text-xs">Carregando gráfico…</span>
      </div>
    </div>
  ),
});

interface PriceData {
  price: number;
  change24h: number;
}

interface Trade {
  id: string;
  asset: string;
  direction: string;
  amount: number;
  entryPrice: number;
  exitPrice: number | null;
  duration: number;
  result: string;
  profit: number;
  createdAt: string;
  expiresAt: string;
}

interface Notification {
  msg: string;
  type: "win" | "loss" | "error";
  key: number;
}

function computeStats(trades: Trade[]) {
  const settled = trades.filter((t) => t.result !== "PENDING");
  const wins = settled.filter((t) => t.result === "WIN");
  const losses = settled.filter((t) => t.result === "LOSS");
  const totalProfit = wins.reduce((s, t) => s + t.profit, 0);
  const totalLost = losses.reduce((s, t) => s + t.amount, 0);
  const pnl = totalProfit - totalLost;
  const winRate = settled.length > 0 ? (wins.length / settled.length) * 100 : 0;
  return { settled: settled.length, wins: wins.length, losses: losses.length, pnl, winRate };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [selectedAsset, setSelectedAsset] = useState<string>(ASSETS[0]);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [amount, setAmount] = useState(10);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [balance, setBalance] = useState<number | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [placing, setPlacing] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [showPanel, setShowPanel] = useState(false);
  const [prevPrice, setPrevPrice] = useState<number>(0);
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);
  const [resetting, setResetting] = useState(false);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    notifTimerRef.current = setTimeout(() => setNotification(null), 3500);
  }, []);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/prices");
      if (res.ok) {
        const data = await res.json();
        setPrices((prev) => {
          const prevVal = prev[selectedAsset]?.price ?? 0;
          const newVal = data[selectedAsset]?.price ?? 0;
          if (newVal > 0 && prevVal > 0) {
            setPriceFlash(newVal >= prevVal ? "up" : "down");
            setTimeout(() => setPriceFlash(null), 600);
          }
          setPrevPrice(prevVal);
          return data;
        });
      }
    } catch {
      /* silent — fallbacks already in API */
    }
  }, [selectedAsset]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/user");
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch {}
  }, []);

  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch("/api/trades");
      if (res.ok) setTrades(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchPrices();
    fetchUser();
    fetchTrades();

    const priceInterval = setInterval(fetchPrices, 5000);
    const dataInterval = setInterval(() => {
      fetchUser();
      fetchTrades();
    }, 15000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(dataInterval);
    };
  }, [status, fetchPrices, fetchUser, fetchTrades]);

  const handleSettle = useCallback(
    async (id: string, exitPrice: number) => {
      try {
        const res = await fetch(`/api/trades/${id}/settle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exitPrice }),
        });

        if (res.ok) {
          const settled = await res.json();
          setTrades((prev) =>
            prev.map((t) => (t.id === id ? { ...t, ...settled } : t))
          );
          await fetchUser();
          if (settled.result === "WIN") {
            showNotif(`🏆 Ganhou! +$${settled.profit.toFixed(2)}`, "win");
          } else {
            showNotif(`💸 Perdeu -$${settled.amount.toFixed(2)}`, "loss");
          }
          setActiveTab("history");
        }
      } catch {}
    },
    [fetchUser, showNotif]
  );

  async function placeTrade(direction: "UP" | "DOWN") {
    if (!currentPrice || placing) return;
    const bal = balance ?? 0;
    if (amount > bal) {
      showNotif("Saldo insuficiente", "error");
      return;
    }
    if (amount < 1) {
      showNotif("Valor mínimo: $1.00", "error");
      return;
    }

    setPlacing(true);
    try {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset: selectedAsset,
          direction,
          amount,
          entryPrice: currentPrice,
          duration: selectedDuration,
        }),
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
    if (!confirm("Resetar saldo para $1.000 e apagar histórico?")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/user/reset", { method: "POST" });
      if (res.ok) {
        setBalance(1000);
        setTrades([]);
        showNotif("Saldo resetado para $1.000", "win");
      }
    } finally {
      setResetting(false);
    }
  }

  function formatPrice(price: number) {
    if (selectedAsset === "EUR/USD" || selectedAsset === "USD/BRL") {
      return price.toFixed(4);
    }
    return price > 1000
      ? price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : price.toFixed(4);
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

        {/* Asset tabs */}
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
                    {p.change24h >= 0 ? "+" : ""}
                    {p.change24h.toFixed(1)}%
                  </span>
                ) : (
                  <span className="hidden md:block text-[10px] text-gray-700">…</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-gray-600 uppercase tracking-wide">Saldo</div>
            <div className="text-sm font-bold text-white font-mono">{balanceDisplay}</div>
          </div>

          {/* Mobile panel toggle */}
          <button
            onClick={() => setShowPanel((v) => !v)}
            className="md:hidden p-1.5 text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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

      {/* Notification toast */}
      <div
        className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
          notification ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        {notification && (
          <div
            key={notification.key}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm shadow-xl ${
              notification.type === "win"
                ? "bg-green-500 text-black"
                : notification.type === "loss"
                ? "bg-red-500 text-white"
                : "bg-yellow-500 text-black"
            }`}
          >
            {notification.msg}
          </div>
        )}
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Chart area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Price bar */}
          <div className="h-14 bg-[#161b22] border-b border-gray-800 flex items-center px-4 gap-4 shrink-0">
            <div
              className={`transition-colors duration-300 ${
                priceFlash === "up"
                  ? "text-green-400"
                  : priceFlash === "down"
                  ? "text-red-400"
                  : "text-white"
              }`}
            >
              <span className="text-xl font-bold font-mono">
                {currentPrice > 0 ? `$${formatPrice(currentPrice)}` : "—"}
              </span>
            </div>
            {change24h !== 0 && (
              <div
                className={`text-sm font-medium ${
                  change24h >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {change24h >= 0 ? "+" : ""}
                {change24h.toFixed(2)}% (24h)
              </div>
            )}
            {currentPrice > 0 && prevPrice > 0 && (
              <div className="text-xs text-gray-600 ml-auto hidden sm:block">
                ant.:{" "}
                <span className="text-gray-500 font-mono">${formatPrice(prevPrice)}</span>
              </div>
            )}
          </div>

          {/* Chart */}
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

        {/* Right panel — desktop always visible, mobile toggled */}
        <div
          className={`
            bg-[#161b22] border-l border-gray-800 flex flex-col shrink-0
            w-full md:w-80
            ${showPanel ? "absolute inset-0 md:relative z-20" : "hidden md:flex"}
          `}
        >
          {/* Close btn on mobile */}
          <div className="md:hidden flex justify-end px-3 pt-2">
            <button
              onClick={() => setShowPanel(false)}
              className="text-gray-500 hover:text-white text-sm"
            >
              ✕ Fechar
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-px bg-gray-800 border-b border-gray-800 shrink-0">
            <div className="bg-[#161b22] px-3 py-2.5 text-center">
              <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-0.5">Win Rate</div>
              <div
                className={`text-sm font-bold ${
                  stats.winRate >= 50 ? "text-green-400" : stats.winRate > 0 ? "text-red-400" : "text-gray-600"
                }`}
              >
                {stats.settled === 0 ? "—" : `${stats.winRate.toFixed(0)}%`}
              </div>
            </div>
            <div className="bg-[#161b22] px-3 py-2.5 text-center">
              <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-0.5">P&L</div>
              <div
                className={`text-sm font-bold font-mono ${
                  stats.pnl > 0 ? "text-green-400" : stats.pnl < 0 ? "text-red-400" : "text-gray-600"
                }`}
              >
                {stats.settled === 0
                  ? "—"
                  : `${stats.pnl >= 0 ? "+" : ""}$${Math.abs(stats.pnl).toFixed(0)}`}
              </div>
            </div>
            <div className="bg-[#161b22] px-3 py-2.5 text-center">
              <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-0.5">Trades</div>
              <div className="text-sm font-bold text-gray-300">
                {stats.settled === 0 ? "—" : (
                  <span>
                    <span className="text-green-500">{stats.wins}</span>
                    <span className="text-gray-600">W </span>
                    <span className="text-red-500">{stats.losses}</span>
                    <span className="text-gray-600">L</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Trading panel */}
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
              <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-1.5">
                Valor (USD)
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setAmount(Math.max(1, Math.min(v, balance ?? 0)));
                  }}
                  min={1}
                  max={balance ?? 0}
                  className="flex-1 bg-[#0e1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500 font-mono"
                />
                <div className="flex gap-1">
                  {[25, 50, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() =>
                        setAmount(Math.max(1, Math.floor((balance ?? 0) * (pct / 100))))
                      }
                      className="px-1.5 py-1.5 bg-[#0e1117] border border-gray-800 rounded text-[10px] text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Payout info */}
            <div className="bg-[#0e1117] rounded-lg px-3 py-2 mb-3 flex items-center justify-between">
              <span className="text-[10px] text-gray-600 uppercase tracking-wide">Retorno (acerto)</span>
              <span className="text-xs text-green-400 font-semibold font-mono">
                +${(amount * PAYOUT_RATE).toFixed(2)}{" "}
                <span className="text-green-600">({(PAYOUT_RATE * 100).toFixed(0)}%)</span>
              </span>
            </div>

            {/* UP / DOWN */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => placeTrade("UP")}
                disabled={placing || !currentPrice || amount > (balance ?? 0) || amount < 1}
                className="py-3 rounded-lg bg-green-500 hover:bg-green-400 active:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="text-base leading-none">▲</span> CIMA
              </button>
              <button
                onClick={() => placeTrade("DOWN")}
                disabled={placing || !currentPrice || amount > (balance ?? 0) || amount < 1}
                className="py-3 rounded-lg bg-red-500 hover:bg-red-400 active:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="text-base leading-none">▼</span> BAIXO
              </button>
            </div>
          </div>

          {/* Trades tabs */}
          <div className="flex border-b border-gray-800 shrink-0">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === "active"
                  ? "text-white border-b-2 border-green-500"
                  : "text-gray-500 hover:text-gray-400"
              }`}
            >
              Ativas{activeTrades.length > 0 && (
                <span className="ml-1 bg-green-500/20 text-green-400 rounded-full px-1.5 py-0.5 text-[10px]">
                  {activeTrades.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === "history"
                  ? "text-white border-b-2 border-green-500"
                  : "text-gray-500 hover:text-gray-400"
              }`}
            >
              Histórico
              {stats.settled > 0 && (
                <span className="ml-1 text-gray-700 text-[10px]">({stats.settled})</span>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === "active" ? (
              <ActiveTrades
                trades={activeTrades}
                currentPrices={prices}
                onSettle={handleSettle}
              />
            ) : (
              <TradeHistory trades={trades} />
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-800 flex items-center justify-between shrink-0">
            <div className="text-xs text-gray-600">
              <span className="text-gray-500">{session?.user?.name}</span>
            </div>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="text-[10px] text-gray-700 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              {resetting ? "Resetando…" : "↺ Resetar saldo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
