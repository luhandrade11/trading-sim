"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ActiveTrades from "@/components/ActiveTrades";
import TradeHistory from "@/components/TradeHistory";

const TradingChart = dynamic(() => import("@/components/TradingChart"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-gray-600 text-sm">Carregando gráfico...</div>
    </div>
  ),
});

const ASSETS = ["BTC/USD", "ETH/USD", "SOL/USD", "EUR/USD", "USD/BRL"];
const DURATIONS = [
  { label: "30s", value: 30 },
  { label: "1min", value: 60 },
  { label: "2min", value: 120 },
  { label: "5min", value: 300 },
];

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

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [selectedAsset, setSelectedAsset] = useState("BTC/USD");
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [amount, setAmount] = useState(10);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [balance, setBalance] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [placing, setPlacing] = useState(false);
  const [notification, setNotification] = useState<{
    msg: string;
    type: "win" | "loss";
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  const activeTrades = trades.filter((t) => t.result === "PENDING");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/prices");
      if (res.ok) setPrices(await res.json());
    } catch {}
  }, []);

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

    const priceInterval = setInterval(fetchPrices, 8000);
    return () => clearInterval(priceInterval);
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

          setNotification({
            msg:
              settled.result === "WIN"
                ? `Ganhou! +$${settled.profit.toFixed(2)}`
                : `Perdeu -$${settled.amount?.toFixed(2) ?? ""}`,
            type: settled.result === "WIN" ? "win" : "loss",
          });
          setTimeout(() => setNotification(null), 3000);
          setActiveTab("history");
        }
      } catch {}
    },
    [fetchUser]
  );

  async function placeTrade(direction: "UP" | "DOWN") {
    const currentPrice = prices[selectedAsset]?.price;
    if (!currentPrice || placing) return;
    if (amount > balance) {
      setNotification({ msg: "Saldo insuficiente", type: "loss" });
      setTimeout(() => setNotification(null), 2000);
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
        setBalance((b) => b - amount);
        setActiveTab("active");
      }
    } finally {
      setPlacing(false);
    }
  }

  const currentPrice = prices[selectedAsset]?.price ?? 0;
  const change24h = prices[selectedAsset]?.change24h ?? 0;

  function formatPrice(price: number, asset: string) {
    if (asset === "EUR/USD" || asset === "USD/BRL") {
      return price.toFixed(4);
    }
    if (price > 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toFixed(4);
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0e1117] flex items-center justify-center">
        <div className="text-gray-500 text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1117] flex flex-col">
      {/* Navbar */}
      <header className="h-12 bg-[#161b22] border-b border-gray-800 flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
            <span className="text-black font-bold text-xs">T</span>
          </div>
          <span className="text-white font-semibold text-sm">TradeSim</span>
        </div>

        <div className="flex items-center gap-1 ml-2 overflow-x-auto">
          {ASSETS.map((asset) => (
            <button
              key={asset}
              onClick={() => setSelectedAsset(asset)}
              className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                selectedAsset === asset
                  ? "bg-green-500/20 text-green-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {asset}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-gray-500">Saldo</div>
            <div className="text-sm font-semibold text-white">
              ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-xs text-gray-500">{session?.user?.name}</div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg font-semibold text-sm shadow-lg transition-all ${
            notification.type === "win"
              ? "bg-green-500 text-black"
              : "bg-red-500 text-white"
          }`}
        >
          {notification.msg}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Chart area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Price bar */}
          <div className="h-14 bg-[#161b22] border-b border-gray-800 flex items-center px-4 gap-6 shrink-0">
            <div>
              <div className="text-xl font-bold text-white font-mono">
                {currentPrice > 0 ? `$${formatPrice(currentPrice, selectedAsset)}` : "—"}
              </div>
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
          </div>

          {/* Chart */}
          <div className="flex-1 p-2">
            {currentPrice > 0 && (
              <TradingChart currentPrice={currentPrice} asset={selectedAsset} />
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-80 bg-[#161b22] border-l border-gray-800 flex flex-col shrink-0">
          {/* Trading panel */}
          <div className="p-4 border-b border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">
              Nova Operação
            </div>

            {/* Duration */}
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1.5">Tempo</div>
              <div className="grid grid-cols-4 gap-1">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setSelectedDuration(d.value)}
                    className={`py-1.5 rounded text-xs font-medium transition-colors ${
                      selectedDuration === d.value
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                        : "bg-[#0e1117] text-gray-500 border border-gray-800 hover:border-gray-600"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-1.5">Valor (USD)</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
                  min={1}
                  max={balance}
                  className="flex-1 bg-[#0e1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                />
                <div className="flex gap-1">
                  {[10, 25, 50].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setAmount(Math.floor(balance * (pct / 100)))}
                      className="px-2 py-1.5 bg-[#0e1117] border border-gray-800 rounded text-xs text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Payout info */}
            <div className="bg-[#0e1117] rounded-lg p-2.5 mb-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">Retorno em caso de acerto</span>
              <span className="text-xs text-green-400 font-semibold">
                +${(amount * 0.85).toFixed(2)} (85%)
              </span>
            </div>

            {/* UP / DOWN buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => placeTrade("UP")}
                disabled={placing || !currentPrice || amount > balance}
                className="py-3 rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm transition-colors flex items-center justify-center gap-1"
              >
                <span className="text-lg leading-none">▲</span> CIMA
              </button>
              <button
                onClick={() => placeTrade("DOWN")}
                disabled={placing || !currentPrice || amount > balance}
                className="py-3 rounded-lg bg-red-500 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-1"
              >
                <span className="text-lg leading-none">▼</span> BAIXO
              </button>
            </div>
          </div>

          {/* Trades panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex border-b border-gray-800">
              <button
                onClick={() => setActiveTab("active")}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === "active"
                    ? "text-white border-b-2 border-green-500"
                    : "text-gray-500 hover:text-gray-400"
                }`}
              >
                Ativas {activeTrades.length > 0 && `(${activeTrades.length})`}
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
          </div>
        </div>
      </div>
    </div>
  );
}
