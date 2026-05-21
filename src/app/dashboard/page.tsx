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
    <div className="w-full h-full flex items-center justify-center bg-[#080c14]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-600 text-xs">Carregando gráfico…</span>
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
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
      staleTimerRef.current = setTimeout(() => setPricesStale(true), 30000);
      setPricesStale(false);
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
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-600 text-xs">Prime Broker</span>
        </div>
      </div>
    );
  }

  const balanceDisplay =
    balance === null
      ? "…"
      : `$${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const canTrade = currentPrice > 0 && !placing && balance !== null && balance >= amount && amount >= 1;

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col">
      {/* ── NAVBAR ── */}
      <header className="h-13 bg-[#0c1018]/95 backdrop-blur-sm border-b border-[#1e2a42] flex items-center px-3 gap-3 shrink-0 z-10">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-md">
            <span className="text-[#080c14] font-black text-[10px] tracking-tight">PB</span>
          </div>
          <span className="font-bold text-sm tracking-tight hidden sm:block">
            <span className="text-white">Prime</span>
            <span className="text-amber-400"> Broker</span>
          </span>
        </div>

        {/* Asset ticker */}
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide flex-1">
          {ASSETS.map((asset) => {
            const p = prices[asset];
            const isSelected = selectedAsset === asset;
            return (
              <button
                key={asset}
                onClick={() => setSelectedAsset(asset)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  isSelected
                    ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent"
                }`}
              >
                <span>{asset}</span>
                {p?.price ? (
                  <span className={`hidden md:block font-mono text-[10px] ${(p.change24h ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {p.change24h >= 0 ? "+" : ""}{p.change24h.toFixed(1)}%
                  </span>
                ) : (
                  <span className="hidden md:block text-[10px] text-slate-700 animate-pulse">…</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Balance pill */}
          <div className="hidden sm:flex items-center gap-2 bg-[#111827] border border-[#1e2a42] rounded-lg px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="text-[9px] text-slate-600 uppercase tracking-widest leading-none mb-0.5">Saldo</div>
              <div className={`text-xs font-bold font-mono ${balance === null ? "text-slate-600 animate-pulse" : "text-white"}`}>
                {balanceDisplay}
              </div>
            </div>
          </div>

          {/* Mobile panel toggle */}
          <button
            onClick={() => setShowPanel((v) => !v)}
            className="md:hidden p-2 text-slate-500 hover:text-white transition-colors bg-[#111827] border border-[#1e2a42] rounded-lg"
            aria-label="Painel de trading"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </button>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-slate-600 hover:text-slate-300 transition-colors hidden sm:block"
          >
            Sair
          </button>
        </div>
      </header>

      {/* ── TOAST ── */}
      <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        notification ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"
      }`}>
        {notification && (
          <div
            key={notification.key}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm shadow-2xl whitespace-nowrap border ${
              notification.type === "win"
                ? "bg-emerald-500 border-emerald-400 text-white"
                : notification.type === "loss"
                ? "bg-rose-500 border-rose-400 text-white"
                : "bg-amber-500 border-amber-400 text-[#080c14]"
            }`}
          >
            {notification.msg}
          </div>
        )}
      </div>

      {/* ── CONFIRM MODAL ── */}
      <ConfirmModal
        open={resetModalOpen}
        title="Resetar saldo"
        message="Isso vai apagar todo o histórico e restaurar o saldo para $1.000. Esta ação não pode ser desfeita."
        confirmLabel={resetting ? "Resetando…" : "Resetar tudo"}
        danger
        onConfirm={handleReset}
        onCancel={() => setResetModalOpen(false)}
      />

      {/* ── MAIN ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* ── CHART AREA ── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Price bar */}
          <div className="h-14 bg-[#0c1018] border-b border-[#1e2a42] flex items-center px-4 gap-4 shrink-0">
            <div>
              <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-0.5">{selectedAsset}</div>
              <div className={`text-xl font-bold font-mono transition-colors duration-300 ${
                priceFlash === "up" ? "text-emerald-400" : priceFlash === "down" ? "text-rose-400" : "text-white"
              }`}>
                {currentPrice > 0 ? `$${formatPrice(currentPrice, selectedAsset)}` : (
                  <span className="text-slate-700 animate-pulse">——</span>
                )}
              </div>
            </div>

            {change24h !== 0 && (
              <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
                change24h >= 0
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/15"
              }`}>
                {change24h >= 0 ? "▲" : "▼"} {Math.abs(change24h).toFixed(2)}%
              </div>
            )}

            {pricesStale && (
              <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-600/10 border border-amber-600/20 rounded-lg px-2 py-1">
                ⚠ preço estimado
              </div>
            )}

            {currentPrice > 0 && prevPrice > 0 && (
              <div className="text-[10px] text-slate-700 ml-auto hidden sm:block font-mono">
                ant: ${formatPrice(prevPrice, selectedAsset)}
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="flex-1 min-h-0">
            {currentPrice > 0 ? (
              <TradingChart currentPrice={currentPrice} asset={selectedAsset} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-[#1e2a42] border-t-amber-400 rounded-full animate-spin" />
                  <span className="text-slate-700 text-xs">Carregando preço…</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className={`bg-[#0c1018] border-l border-[#1e2a42] flex flex-col shrink-0 w-full md:w-[300px] ${
          showPanel ? "absolute inset-0 md:relative z-20" : "hidden md:flex"
        }`}>

          {/* Mobile header */}
          <div className="md:hidden flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#1e2a42]">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Painel</span>
            <button onClick={() => setShowPanel(false)} className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
              ✕
            </button>
          </div>

          {/* Balance card */}
          <div className="p-3 border-b border-[#1e2a42] shrink-0">
            <div className="bg-gradient-to-br from-[#111827] to-[#0d1117] border border-[#1e2a42] rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest">Saldo Virtual</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] text-emerald-500 font-medium">LIVE</span>
                </div>
              </div>
              <div className={`text-2xl font-bold font-mono tracking-tight ${
                balance === null ? "text-slate-700 animate-pulse" : "text-white"
              }`}>
                {balanceDisplay}
              </div>
              {stats.settled > 0 && (
                <div className={`text-xs font-semibold mt-1 ${stats.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {stats.pnl >= 0 ? "▲" : "▼"} ${Math.abs(stats.pnl).toFixed(2)} P&L total
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-px bg-[#1e2a42]/30 shrink-0">
            {[
              {
                label: "Win Rate",
                value: stats.settled === 0 ? "—" : `${stats.winRate.toFixed(0)}%`,
                color: stats.winRate >= 50 ? "text-emerald-400" : stats.winRate > 0 ? "text-rose-400" : "text-slate-600",
              },
              {
                label: "P&L",
                value: stats.settled === 0 ? "—" : `${stats.pnl >= 0 ? "+" : ""}$${Math.abs(stats.pnl).toFixed(0)}`,
                color: stats.pnl > 0 ? "text-emerald-400" : stats.pnl < 0 ? "text-rose-400" : "text-slate-600",
              },
              {
                label: "Streak",
                value: stats.streak === 0 ? "—" : `${stats.streakType === "WIN" ? "🔥" : "❄️"} ${stats.streak}`,
                color: stats.streakType === "WIN" ? "text-emerald-400" : stats.streakType === "LOSS" ? "text-rose-400" : "text-slate-600",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#0c1018] px-2 py-2.5 text-center">
                <div className="text-[8px] text-slate-700 uppercase tracking-widest mb-1">{label}</div>
                <div className={`text-sm font-bold ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          {/* Sub-stats */}
          {stats.settled > 0 && (
            <div className="flex items-center justify-around px-3 py-1.5 border-b border-[#1e2a42] shrink-0">
              <span className="text-[9px] text-slate-600">
                <span className="text-emerald-500 font-bold">{stats.wins}</span>W{" "}
                <span className="text-rose-500 font-bold">{stats.losses}</span>L
              </span>
              <span className="text-[#1e2a42]">|</span>
              <span className="text-[9px] text-slate-600">
                Invest <span className="text-slate-400">${stats.totalInvested.toFixed(0)}</span>
              </span>
              <span className="text-[#1e2a42]">|</span>
              <span className="text-[9px] text-slate-600">
                Lucro <span className="text-emerald-600">${stats.totalProfit.toFixed(0)}</span>
              </span>
            </div>
          )}

          {/* ── TRADING CONTROLS ── */}
          <div className="p-3 border-b border-[#1e2a42] shrink-0 space-y-3">

            {/* Duration */}
            <div>
              <div className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Expiração</div>
              <div className="grid grid-cols-4 gap-1">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setSelectedDuration(d.value)}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedDuration === d.value
                        ? "bg-amber-400/15 text-amber-400 border border-amber-400/30"
                        : "bg-[#0d1117] text-slate-600 border border-[#1e2a42] hover:border-[#2d4070] hover:text-slate-400"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest">Investimento (USD)</div>
                {balance !== null && (
                  <div className="text-[9px] text-slate-700">
                    Disp.: <span className="text-slate-500 font-mono">${balance.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
                  min={1}
                  max={balance ?? undefined}
                  className="flex-1 bg-[#0d1117] border border-[#1e2a42] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/15 font-mono transition-all"
                />
                <div className="flex gap-1">
                  {[25, 50, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setAmount(Math.max(1, Math.floor((balance ?? 0) * (pct / 100))))}
                      disabled={balance === null || balance < 1}
                      className="px-1.5 py-2 bg-[#0d1117] border border-[#1e2a42] rounded-lg text-[10px] text-slate-600 hover:text-slate-300 hover:border-[#2d4070] transition-colors disabled:opacity-30"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
              {amount > (balance ?? 0) && balance !== null && (
                <p className="text-rose-400 text-[10px] mt-1.5">Valor acima do saldo disponível</p>
              )}
            </div>

            {/* Payout preview */}
            <div className="flex items-center justify-between bg-[#0d1117] border border-[#1e2a42] rounded-xl px-3 py-2">
              <div>
                <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-0.5">Retorno estimado</div>
                <div className="text-xs text-slate-400 font-mono">
                  ${amount.toFixed(2)} → <span className="text-emerald-400 font-bold">${(amount + amount * PAYOUT_RATE).toFixed(2)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-0.5">Payout</div>
                <div className="text-sm font-bold text-emerald-400">+{(PAYOUT_RATE * 100).toFixed(0)}%</div>
              </div>
            </div>

            {/* Trade buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => placeTrade("UP")}
                disabled={!canTrade}
                className="btn-up py-4 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-sm flex flex-col items-center justify-center gap-0.5"
              >
                <span className="text-lg leading-none">▲</span>
                <span>CIMA</span>
              </button>
              <button
                onClick={() => placeTrade("DOWN")}
                disabled={!canTrade}
                className="btn-down py-4 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-sm flex flex-col items-center justify-center gap-0.5"
              >
                <span className="text-lg leading-none">▼</span>
                <span>BAIXO</span>
              </button>
            </div>

            {placing && (
              <div className="flex items-center justify-center gap-2 text-xs text-amber-400">
                <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />
                Abrindo operação…
              </div>
            )}
          </div>

          {/* ── TABS ── */}
          <div className="flex border-b border-[#1e2a42] shrink-0">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex-1 py-2.5 text-xs font-semibold transition-all ${
                activeTab === "active"
                  ? "text-amber-400 border-b-2 border-amber-400"
                  : "text-slate-600 hover:text-slate-400"
              }`}
            >
              Ativas
              {activeTrades.length > 0 && (
                <span className="ml-1 bg-amber-400/15 text-amber-400 rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                  {activeTrades.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-2.5 text-xs font-semibold transition-all ${
                activeTab === "history"
                  ? "text-amber-400 border-b-2 border-amber-400"
                  : "text-slate-600 hover:text-slate-400"
              }`}
            >
              Histórico
              {stats.settled > 0 && (
                <span className="ml-1 text-slate-700 text-[9px]">({stats.settled})</span>
              )}
            </button>
          </div>

          {/* Trade list */}
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
          <div className="px-3 py-2.5 border-t border-[#1e2a42] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <span className="text-[#080c14] font-black text-[8px]">
                  {session?.user?.name?.charAt(0).toUpperCase() ?? "?"}
                </span>
              </div>
              <span className="text-xs text-slate-500 truncate max-w-[100px]">
                {session?.user?.name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setResetModalOpen(true)}
                disabled={resetting}
                className="text-[10px] text-slate-700 hover:text-rose-400 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                ↺ Reset
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-[10px] text-slate-700 hover:text-slate-400 transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
