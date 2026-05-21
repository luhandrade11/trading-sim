"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ActiveTrades from "@/components/ActiveTrades";
import TradeHistory from "@/components/TradeHistory";
import PositionsTable from "@/components/PositionsTable";
import ConfirmModal from "@/components/ConfirmModal";
import AssetPicker from "@/components/AssetPicker";
import { PAYOUT_RATE, ALL_ASSETS, DEFAULT_TABS, DURATIONS } from "@/lib/constants";
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

type SidebarView = "trade" | "history" | "stats";
type ChartType   = "candle" | "line";

interface PriceData { price: number; change24h: number }
interface Trade {
  id: string; asset: string; direction: string; amount: number;
  entryPrice: number; exitPrice: number | null; duration: number;
  result: string; profit: number; createdAt: string; expiresAt: string;
}
interface Notification { msg: string; type: "win" | "loss" | "error"; key: number }

// ── Sidebar icon buttons ──────────────────────────────────────────────────────
function SidebarBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} title={label}
      className={`relative w-10 h-10 flex flex-col items-center justify-center rounded-xl transition-all gap-0.5 ${
        active ? "bg-amber-400/15 text-amber-400" : "text-slate-600 hover:text-slate-300 hover:bg-white/5"
      }`}
    >
      {icon}
      <span className="text-[8px] font-medium leading-none">{label}</span>
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-400 rounded-r-full" />}
    </button>
  );
}

const IconChart   = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M3 20h18"/></svg>;
const IconHistory = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
const IconStats   = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>;
const IconReset   = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>;

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Open asset tabs (persisted in localStorage)
  const [openAssets, setOpenAssets] = useState<string[]>(DEFAULT_TABS);
  const [selectedAsset, setSelectedAsset] = useState<string>(DEFAULT_TABS[0]);

  const [selectedDuration, setSelectedDuration] = useState(60);
  const [amount, setAmount] = useState(10);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [pricesStale, setPricesStale] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [sidebarView, setSidebarView] = useState<SidebarView>("trade");
  const [chartType, setChartType] = useState<ChartType>("candle");
  const [positionsOpen, setPositionsOpen] = useState(true);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settlingRef   = useRef<Set<string>>(new Set());

  const activeTrades = trades.filter((t) => t.result === "PENDING");
  const stats = computeStats(trades);
  const currentPrice = prices[selectedAsset]?.price ?? 0;
  const change24h    = prices[selectedAsset]?.change24h ?? 0;

  // Load saved tabs from localStorage after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pb-open-assets");
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOpenAssets(parsed);
          setSelectedAsset(parsed[0]);
        }
      }
    } catch {}
  }, []);

  // Persist open tabs
  useEffect(() => {
    localStorage.setItem("pb-open-assets", JSON.stringify(openAssets));
  }, [openAssets]);

  // Keep selectedAsset valid
  useEffect(() => {
    if (!openAssets.includes(selectedAsset) && openAssets.length > 0) {
      setSelectedAsset(openAssets[0]);
    }
  }, [openAssets, selectedAsset]);

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
        const newVal  = data[selectedAsset]?.price ?? 0;
        if (newVal > 0 && prevVal > 0 && newVal !== prevVal) {
          setPriceFlash(newVal > prevVal ? "up" : "down");
          setTimeout(() => setPriceFlash(null), 600);
        }
        return data;
      });
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
      staleTimerRef.current = setTimeout(() => setPricesStale(true), 30000);
      setPricesStale(false);
    } catch {}
  }, [selectedAsset]);

  const fetchUser   = useCallback(async () => {
    try { const r = await fetch("/api/user"); if (r.ok) setBalance((await r.json()).balance); } catch {}
  }, []);

  const fetchTrades = useCallback(async () => {
    try {
      const r = await fetch("/api/trades");
      if (r.ok) { setTrades(await r.json()); setTradesLoading(false); }
    } catch {}
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchPrices(); fetchUser(); fetchTrades();
    const p = setInterval(fetchPrices, 5000);
    const d = setInterval(() => { fetchUser(); fetchTrades(); }, 15000);
    return () => {
      clearInterval(p); clearInterval(d);
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    };
  }, [status, fetchPrices, fetchUser, fetchTrades]);

  const handleSettle = useCallback(async (id: string, exitPrice: number) => {
    if (settlingRef.current.has(id)) return;
    settlingRef.current.add(id);
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
        showNotif(
          settled.result === "WIN"
            ? `🏆 Ganhou! +$${settled.profit.toFixed(2)}`
            : `💸 Perdeu -$${settled.amount.toFixed(2)}`,
          settled.result === "WIN" ? "win" : "loss"
        );
      } else {
        showNotif("Erro ao finalizar operação", "error");
      }
    } catch { showNotif("Erro de conexão", "error"); }
  }, [fetchUser, showNotif]);

  async function placeTrade(direction: "UP" | "DOWN") {
    if (!currentPrice || placing) return;
    if (balance === null) { showNotif("Aguarde o saldo carregar", "error"); return; }
    if (amount > balance)  { showNotif("Saldo insuficiente", "error"); return; }
    if (amount < 1)        { showNotif("Valor mínimo: $1.00", "error"); return; }
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
        setBalance((b) => b !== null ? b - amount : null);
        setPositionsOpen(true);
      } else {
        const d = await res.json();
        showNotif(d.error ?? "Erro ao abrir operação", "error");
      }
    } catch { showNotif("Erro de conexão", "error"); }
    finally { setPlacing(false); }
  }

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch("/api/user/reset", { method: "POST" });
      if (res.ok) {
        setBalance(1000); setTrades([]); settlingRef.current.clear();
        showNotif("✓ Saldo resetado para $1.000", "win");
      } else showNotif("Erro ao resetar saldo", "error");
    } catch { showNotif("Erro de conexão", "error"); }
    finally { setResetting(false); setResetModalOpen(false); }
  }

  function addAsset(symbol: string) {
    if (!openAssets.includes(symbol)) setOpenAssets((p) => [...p, symbol]);
  }
  function removeAsset(symbol: string) {
    if (openAssets.length <= 1) return; // at least 1 must stay open
    setOpenAssets((p) => p.filter((a) => a !== symbol));
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-700 text-xs tracking-widest uppercase">Prime Broker</span>
        </div>
      </div>
    );
  }

  const canTrade = currentPrice > 0 && !placing && balance !== null && balance >= amount && amount >= 1;
  const balanceDisplay = balance === null
    ? "…"
    : `$${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="h-screen flex flex-col bg-[#080c14] overflow-hidden">

      {/* ── TOAST ── */}
      <div className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${notification ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"}`}>
        {notification && (
          <div key={notification.key} className={`px-5 py-2.5 rounded-xl font-semibold text-sm shadow-2xl whitespace-nowrap border ${
            notification.type === "win"   ? "bg-emerald-500 border-emerald-400 text-white"
            : notification.type === "loss" ? "bg-rose-500 border-rose-400 text-white"
            : "bg-amber-500 border-amber-400 text-[#080c14]"
          }`}>{notification.msg}</div>
        )}
      </div>

      {/* ── MODALS ── */}
      <ConfirmModal
        open={resetModalOpen}
        title="Resetar saldo"
        message="Apaga todo o histórico e restaura o saldo para $1.000. Não pode ser desfeito."
        confirmLabel={resetting ? "Resetando…" : "Resetar tudo"}
        danger
        onConfirm={handleReset}
        onCancel={() => setResetModalOpen(false)}
      />
      {showAssetPicker && (
        <AssetPicker
          assets={ALL_ASSETS}
          openAssets={openAssets}
          prices={prices}
          onAdd={addAsset}
          onRemove={removeAsset}
          onClose={() => setShowAssetPicker(false)}
        />
      )}

      {/* ── HEADER ── */}
      <header className="h-12 bg-[#0c1018] border-b border-[#1e2a42] flex items-center px-3 gap-0 shrink-0 z-10">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0 pr-3 mr-1 border-r border-[#1e2a42]">
          <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
            <span className="text-[#080c14] font-black text-[9px]">PB</span>
          </div>
          <span className="font-bold text-sm tracking-tight hidden sm:block">
            <span className="text-white">Prime</span><span className="text-amber-400"> Broker</span>
          </span>
        </div>

        {/* Asset tabs */}
        <div className="flex items-stretch gap-0 overflow-x-auto scrollbar-hide flex-1 h-full">
          {openAssets.map((symbol) => {
            const p    = prices[symbol];
            const info = ALL_ASSETS.find((a) => a.symbol === symbol);
            const isSelected = selectedAsset === symbol;
            const isForex    = info?.type === "forex";
            return (
              <button
                key={symbol}
                onClick={() => setSelectedAsset(symbol)}
                className={`group flex flex-col items-start justify-center px-3 h-full border-b-2 transition-all shrink-0 relative ${
                  isSelected ? "border-amber-400 bg-[#111827]/60" : "border-transparent hover:border-[#2d4070] hover:bg-white/3"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isForex ? "bg-blue-400" : "bg-amber-400"}`} />
                  <span className={`text-[11px] font-semibold ${isSelected ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`}>
                    {symbol}
                  </span>
                  {/* Remove tab button — visible on hover */}
                  {openAssets.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeAsset(symbol); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-slate-300 transition-all ml-0.5 leading-none text-xs"
                      title="Fechar"
                    >×</button>
                  )}
                </div>
                {p?.price ? (
                  <span className={`text-[9px] font-mono leading-none mt-0.5 ${(p.change24h ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {p.change24h >= 0 ? "+" : ""}{p.change24h.toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-700 leading-none mt-0.5 animate-pulse">…</span>
                )}
              </button>
            );
          })}

          {/* Add asset button */}
          <button
            onClick={() => setShowAssetPicker(true)}
            title="Adicionar ativo"
            className="flex items-center justify-center w-9 h-full text-slate-600 hover:text-amber-400 hover:bg-white/5 transition-all shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Balance + actions */}
        <div className="flex items-center gap-2 shrink-0 pl-3 border-l border-[#1e2a42]">
          <div className="hidden sm:flex items-center gap-2 bg-[#111827] border border-[#1e2a42] rounded-lg px-2.5 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="text-[8px] text-slate-600 uppercase tracking-widest leading-none mb-0.5">Saldo</div>
              <div className={`text-xs font-bold font-mono ${balance === null ? "text-slate-600 animate-pulse" : "text-white"}`}>
                {balanceDisplay}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowMobilePanel((v) => !v)}
            className="md:hidden p-2 text-slate-500 hover:text-white transition-colors bg-[#111827] border border-[#1e2a42] rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="hidden sm:block text-[10px] text-slate-600 hover:text-slate-400 transition-colors px-1">
            Sair
          </button>
        </div>
      </header>

      {/* ── MAIN ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── SIDEBAR ── */}
        <aside className="w-14 bg-[#0c1018] border-r border-[#1e2a42] flex-col items-center py-3 gap-1 shrink-0 hidden md:flex">
          <SidebarBtn icon={<IconChart />}   label="Trade"    active={sidebarView === "trade"}   onClick={() => setSidebarView("trade")} />
          <SidebarBtn icon={<IconHistory />} label="Histórico" active={sidebarView === "history"} onClick={() => setSidebarView("history")} />
          <SidebarBtn icon={<IconStats />}   label="Análise"  active={sidebarView === "stats"}   onClick={() => setSidebarView("stats")} />
          <div className="mt-auto">
            <SidebarBtn icon={<IconReset />} label="Reset" active={false} onClick={() => setResetModalOpen(true)} />
          </div>
        </aside>

        {/* ── CHART ── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="h-11 bg-[#0c1018] border-b border-[#1e2a42] flex items-center px-4 gap-3 shrink-0">
            <div className="flex items-baseline gap-2">
              <span className={`text-lg font-bold font-mono transition-colors duration-300 ${
                priceFlash === "up" ? "text-emerald-400" : priceFlash === "down" ? "text-rose-400" : "text-white"
              }`}>
                {currentPrice > 0
                  ? `$${formatPrice(currentPrice, selectedAsset)}`
                  : <span className="text-slate-700 animate-pulse">——</span>}
              </span>
              {change24h !== 0 && (
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-lg ${
                  change24h >= 0
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/15"
                }`}>
                  {change24h >= 0 ? "▲" : "▼"} {Math.abs(change24h).toFixed(2)}%
                </span>
              )}
              {pricesStale && (
                <span className="text-[10px] text-amber-600 bg-amber-600/10 border border-amber-600/20 rounded-lg px-2 py-0.5">⚠ estimado</span>
              )}
            </div>
            <div className="ml-auto flex items-center bg-[#111827] border border-[#1e2a42] rounded-lg p-0.5 gap-0.5">
              {(["candle", "line"] as ChartType[]).map((t) => (
                <button key={t} onClick={() => setChartType(t)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${chartType === t ? "bg-amber-400/15 text-amber-400" : "text-slate-600 hover:text-slate-400"}`}
                >
                  {t === "candle" ? "◈ Candles" : "⟆ Linha"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {currentPrice > 0
              ? <TradingChart currentPrice={currentPrice} asset={selectedAsset} chartType={chartType} />
              : (
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
        <div className={`bg-[#0c1018] border-l border-[#1e2a42] flex flex-col shrink-0 w-[240px] ${showMobilePanel ? "absolute inset-0 z-30 w-full md:relative md:w-[240px]" : "hidden md:flex"}`}>

          <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-[#1e2a42]">
            <span className="text-xs text-slate-500 font-semibold">Painel</span>
            <button onClick={() => setShowMobilePanel(false)} className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/5">✕</button>
          </div>

          {/* Balance */}
          <div className="px-3 pt-3 pb-2.5 border-b border-[#1e2a42] shrink-0">
            <div className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest mb-1">Saldo Virtual</div>
            <div className={`text-2xl font-bold font-mono ${balance === null ? "text-slate-700 animate-pulse" : "text-white"}`}>
              {balanceDisplay}
            </div>
            {stats.settled > 0 && (
              <div className={`text-[10px] font-semibold mt-0.5 ${stats.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {stats.pnl >= 0 ? "▲" : "▼"} ${Math.abs(stats.pnl).toFixed(2)} P&L
              </div>
            )}
          </div>

          {/* Trade view */}
          {sidebarView === "trade" && (
            <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
              <div className="p-3 space-y-3 shrink-0">

                {/* Duration */}
                <div>
                  <div className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Expiração</div>
                  <div className="grid grid-cols-4 gap-1">
                    {DURATIONS.map((d) => (
                      <button key={d.value} onClick={() => setSelectedDuration(d.value)}
                        className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selectedDuration === d.value
                            ? "bg-amber-400/15 text-amber-400 border border-amber-400/30"
                            : "bg-[#0d1117] text-slate-600 border border-[#1e2a42] hover:border-[#2d4070] hover:text-slate-400"
                        }`}
                      >{d.label}</button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest">Investir (USD)</div>
                    {balance !== null && <span className="text-[9px] text-slate-700 font-mono">${balance.toFixed(2)}</span>}
                  </div>
                  <div className="flex items-center gap-1 bg-[#0d1117] border border-[#1e2a42] rounded-xl overflow-hidden focus-within:border-amber-500/40">
                    <button onClick={() => setAmount((a) => Math.max(1, a - 5))} className="w-8 h-9 text-slate-500 hover:text-white hover:bg-white/5 transition-colors text-sm font-bold shrink-0">−</button>
                    <input
                      type="number" value={amount}
                      onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
                      min={1}
                      className="flex-1 bg-transparent text-center text-white text-sm font-mono focus:outline-none py-2 min-w-0"
                    />
                    <button onClick={() => setAmount((a) => a + 5)} className="w-8 h-9 text-slate-500 hover:text-white hover:bg-white/5 transition-colors text-sm font-bold shrink-0">+</button>
                  </div>
                  <div className="flex gap-1 mt-1.5">
                    {[25, 50, 100].map((pct) => (
                      <button key={pct}
                        onClick={() => setAmount(Math.max(1, Math.floor((balance ?? 0) * (pct / 100))))}
                        disabled={balance === null || balance < 1}
                        className="flex-1 py-1 bg-[#0d1117] border border-[#1e2a42] rounded-lg text-[9px] text-slate-600 hover:text-slate-300 hover:border-[#2d4070] transition-colors disabled:opacity-30 font-semibold"
                      >{pct}%</button>
                    ))}
                  </div>
                  {amount > (balance ?? 0) && balance !== null && (
                    <p className="text-rose-400 text-[10px] mt-1">Saldo insuficiente</p>
                  )}
                </div>

                {/* Profit display */}
                <div className="bg-[#0d1117] border border-[#1e2a42] rounded-xl px-3 py-2.5">
                  <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">Lucro Potencial</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-emerald-400">+{(PAYOUT_RATE * 100).toFixed(0)}%</span>
                    <span className="text-sm text-emerald-500 font-mono font-semibold">+${(amount * PAYOUT_RATE).toFixed(2)}</span>
                  </div>
                  <div className="text-[9px] text-slate-700 mt-0.5 font-mono">
                    ${amount.toFixed(2)} → ${(amount + amount * PAYOUT_RATE).toFixed(2)}
                  </div>
                </div>

                {/* Buy / Sell */}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => placeTrade("UP")} disabled={!canTrade}
                    className="btn-up py-3.5 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-sm flex flex-col items-center gap-0.5"
                  >
                    <span className="text-base leading-none">▲</span>
                    <span className="text-xs">COMPRA</span>
                    {currentPrice > 0 && <span className="text-[9px] opacity-70 font-mono">{formatPrice(currentPrice, selectedAsset)}</span>}
                  </button>
                  <button onClick={() => placeTrade("DOWN")} disabled={!canTrade}
                    className="btn-down py-3.5 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-sm flex flex-col items-center gap-0.5"
                  >
                    <span className="text-base leading-none">▼</span>
                    <span className="text-xs">VENDA</span>
                    {currentPrice > 0 && <span className="text-[9px] opacity-70 font-mono">{formatPrice(currentPrice, selectedAsset)}</span>}
                  </button>
                </div>

                {placing && (
                  <div className="flex items-center justify-center gap-2 text-xs text-amber-400">
                    <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />
                    Abrindo operação…
                  </div>
                )}
              </div>

              {/* Mini stats at bottom */}
              {stats.settled > 0 && (
                <div className="mt-auto shrink-0 border-t border-[#1e2a42] p-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Win%",  value: `${stats.winRate.toFixed(0)}%`,  color: stats.winRate >= 50 ? "text-emerald-400" : "text-rose-400" },
                      { label: "P&L",   value: `${stats.pnl >= 0 ? "+" : ""}$${Math.abs(stats.pnl).toFixed(0)}`, color: stats.pnl >= 0 ? "text-emerald-400" : "text-rose-400" },
                      { label: "Streak",value: stats.streak === 0 ? "—" : `${stats.streakType === "WIN" ? "🔥" : "❄️"}${stats.streak}`, color: stats.streakType === "WIN" ? "text-emerald-400" : "text-rose-400" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-[#0d1117] border border-[#1e2a42] rounded-xl p-2 text-center">
                        <div className="text-[8px] text-slate-700 uppercase tracking-wide mb-0.5">{label}</div>
                        <div className={`text-xs font-bold ${color}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {sidebarView === "history" && (
            <div className="flex-1 overflow-y-auto p-3 min-h-0">
              <TradeHistory trades={trades} loading={tradesLoading} />
            </div>
          )}

          {sidebarView === "stats" && (
            <div className="flex-1 overflow-y-auto p-3 min-h-0 space-y-3">
              <div className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest">Estatísticas</div>
              {stats.settled === 0 ? (
                <p className="text-slate-600 text-xs text-center py-8">Nenhuma operação finalizada</p>
              ) : (
                [
                  { label: "Operações",    value: String(stats.settled) },
                  { label: "Vitórias",     value: String(stats.wins),                          color: "text-emerald-400" },
                  { label: "Derrotas",     value: String(stats.losses),                         color: "text-rose-400" },
                  { label: "Win Rate",     value: `${stats.winRate.toFixed(1)}%`,              color: stats.winRate >= 50 ? "text-emerald-400" : "text-rose-400" },
                  { label: "P&L Total",    value: `${stats.pnl >= 0 ? "+" : ""}$${stats.pnl.toFixed(2)}`, color: stats.pnl >= 0 ? "text-emerald-400" : "text-rose-400" },
                  { label: "Investido",    value: `$${stats.totalInvested.toFixed(2)}` },
                  { label: "Total Ganho",  value: `$${stats.totalProfit.toFixed(2)}`,          color: "text-emerald-400" },
                  { label: "Total Perdido",value: `-$${stats.totalLost.toFixed(2)}`,            color: "text-rose-400" },
                  { label: "Streak",       value: stats.streak === 0 ? "—" : `${stats.streakType === "WIN" ? "🔥" : "❄️"} ${stats.streak}x`, color: stats.streakType === "WIN" ? "text-emerald-400" : "text-rose-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-[#1e2a42]">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className={`text-xs font-bold font-mono ${color ?? "text-white"}`}>{value}</span>
                  </div>
                ))
              )}
              <button onClick={() => setResetModalOpen(true)}
                className="w-full mt-4 py-2.5 rounded-xl text-xs font-semibold text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 transition-colors"
              >↺ Resetar conta</button>
            </div>
          )}

          {/* Footer */}
          <div className="px-3 py-2 border-t border-[#1e2a42] flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0">
              <span className="text-[#080c14] font-black text-[8px]">{session?.user?.name?.charAt(0).toUpperCase() ?? "?"}</span>
            </div>
            <span className="text-[10px] text-slate-600 truncate flex-1">{session?.user?.name}</span>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-[9px] text-slate-700 hover:text-slate-400 transition-colors">Sair</button>
          </div>
        </div>
      </div>

      {/* Hidden ActiveTrades — keeps settlement timers running */}
      <div className="sr-only" aria-hidden>
        <ActiveTrades trades={activeTrades} currentPrices={prices} onSettle={handleSettle} loading={false} />
      </div>

      {/* ── BOTTOM POSITIONS ── */}
      <div className={`shrink-0 border-t border-[#1e2a42] transition-all duration-300 ${positionsOpen ? "h-[150px]" : "h-10"} hidden md:block`}>
        <div className="h-10 bg-[#0c1018] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Operações Abertas</span>
            {activeTrades.length > 0 && (
              <span className="bg-amber-400/15 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{activeTrades.length}</span>
            )}
          </div>
          <button onClick={() => setPositionsOpen((v) => !v)} className="text-slate-600 hover:text-slate-300 transition-colors text-[10px]">
            {positionsOpen ? "Ocultar ▲" : "Expandir ▼"}
          </button>
        </div>
        {positionsOpen && (
          <div className="h-[110px] bg-[#080c14]">
            <PositionsTable trades={activeTrades} currentPrices={prices} />
          </div>
        )}
      </div>
    </div>
  );
}
