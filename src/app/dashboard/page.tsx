"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import ActiveTrades from "@/components/ActiveTrades";
import TradeHistory from "@/components/TradeHistory";
import PositionsTable from "@/components/PositionsTable";
import ConfirmModal from "@/components/ConfirmModal";
import AssetPicker from "@/components/AssetPicker";
import { PAYOUT_RATE, ALL_ASSETS, DEFAULT_TABS, DURATIONS, getSpread } from "@/lib/constants";
import { computeStats, formatPrice } from "@/lib/utils";
import type { Trade } from "@/types/trade";

const TradingChart = dynamic(() => import("@/components/TradingChart"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#050509]">
      <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
    </div>
  ),
});

type SidebarView = "trade" | "history" | "stats";
type ChartType   = "candle" | "line";
interface PriceData { price: number; change24h: number }
interface Notification { msg: string; type: "win" | "loss" | "error"; key: number }
interface OhlcData { open: number; high: number; low: number; close: number }

// Sentiment: seed per asset + current 24h trend
function calcBuySentiment(asset: string, change24h: number): number {
  const seed = asset.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 11 - 5;
  const trend = Math.min(15, Math.max(-15, change24h * 1.5));
  return Math.max(30, Math.min(70, Math.round(50 + trend + seed)));
}

// Avatar from initials
function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initial = name?.charAt(0).toUpperCase() ?? "?";
  const sz = size === "sm" ? "w-6 h-6 text-[8px]" : size === "lg" ? "w-10 h-10 text-sm" : "w-7 h-7 text-[9px]";
  return (
    <div className={`${sz} rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 font-black text-[#080c14]`}>
      {initial}
    </div>
  );
}

// ── Left nav sidebar ──────────────────────────────────────────────────────────
function NavItem({ icon, label, active = false, badge, onClick, href }: {
  icon: React.ReactNode; label: string; active?: boolean;
  badge?: string; onClick?: () => void; href?: string;
}) {
  const cls = `relative flex flex-col items-center justify-center gap-1 w-full py-3 transition-all cursor-pointer ${
    active ? "text-amber-400 bg-amber-400/8" : "text-slate-600 hover:text-slate-300 hover:bg-white/3"
  }`;
  const inner = (
    <>
      <div className="relative">
        {icon}
        {badge && (
          <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-[#080c14] text-[7px] font-black px-1 rounded-full leading-tight min-w-[14px] text-center">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[8px] font-semibold leading-none tracking-wide uppercase">{label}</span>
      {active && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-amber-400 rounded-l-full" />}
    </>
  );
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return <button onClick={onClick} className={cls}>{inner}</button>;
}

const IcoTrade    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M3 20h18"/></svg>;
const IcoHistory  = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
const IcoTrophy   = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>;
const IcoStats    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>;
const IcoPromo    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>;
const IcoUser     = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>;
const IcoReset    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>;
const IcoSupport  = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>;

// ── Deposit modal ─────────────────────────────────────────────────────────────
function DepositModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[#0d1117] border border-[#1e2a42] rounded-2xl p-7 w-full max-w-sm card-shadow">
        <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-5">
          <span className="text-2xl">💰</span>
        </div>
        <h3 className="text-white font-bold text-lg mb-2">Conta Real</h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          Para operar com dinheiro real e sacar seus lucros, entre em contato com nosso suporte e abra sua conta profissional.
        </p>
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-emerald-400 text-xs font-semibold">Conta Demo Ativa</span>
          </div>
          <p className="text-slate-500 text-xs">Você está operando com $1.000 virtuais. Pratique à vontade antes de migrar para a conta real.</p>
        </div>
        <div className="space-y-2">
          <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl text-sm transition-all">
            <span>📱</span> Falar com suporte
          </a>
          <button onClick={onClose} className="w-full py-2.5 text-sm text-slate-500 hover:text-white transition-colors">
            Continuar com conta demo
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [openAssets,       setOpenAssets]       = useState<string[]>(DEFAULT_TABS);
  const [selectedAsset,    setSelectedAsset]    = useState<string>(DEFAULT_TABS[0]);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [amount,           setAmount]           = useState(10);
  const [prices,           setPrices]           = useState<Record<string, PriceData>>({});
  const [pricesStale,      setPricesStale]      = useState(false);
  const [balance,          setBalance]          = useState<number | null>(null);
  const [trades,           setTrades]           = useState<Trade[]>([]);
  const [tradesLoading,    setTradesLoading]    = useState(true);
  const [placing,          setPlacing]          = useState(false);
  const [notification,     setNotification]     = useState<Notification | null>(null);
  const [sidebarView,      setSidebarView]      = useState<SidebarView>("trade");
  const [chartType,        setChartType]        = useState<ChartType>("line");
  const [positionsOpen,    setPositionsOpen]    = useState(true);
  const [showMobilePanel,  setShowMobilePanel]  = useState(false);
  const [showAssetPicker,  setShowAssetPicker]  = useState(false);
  const [priceFlash,       setPriceFlash]       = useState<"up" | "down" | null>(null);
  const [resetModalOpen,   setResetModalOpen]   = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [resetting,        setResetting]        = useState(false);
  const [ohlc,             setOhlc]             = useState<OhlcData | null>(null);

  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settlingRef   = useRef<Set<string>>(new Set());

  const activeTrades = trades.filter((t) => t.result === "PENDING");
  const stats        = useMemo(() => computeStats(trades), [trades]);
  const currentPrice = prices[selectedAsset]?.price ?? 0;
  const change24h    = prices[selectedAsset]?.change24h ?? 0;
  const buySentiment = useMemo(() => calcBuySentiment(selectedAsset, change24h), [selectedAsset, change24h]);

  // Bid/Ask spread
  const spread  = getSpread(selectedAsset);
  const askPrice = currentPrice > 0 ? currentPrice * (1 + spread) : 0;
  const bidPrice = currentPrice > 0 ? currentPrice * (1 - spread) : 0;

  const activeEntries = useMemo(
    () => activeTrades
      .filter((t) => t.asset === selectedAsset)
      .map((t) => ({ entryPrice: t.entryPrice, direction: t.direction as "UP" | "DOWN" })),
    [activeTrades, selectedAsset]
  );

  // Load tabs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pb-open-assets");
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        const valid = parsed.filter((s) => ALL_ASSETS.some((a) => a.symbol === s));
        if (valid.length > 0) { setOpenAssets(valid); setSelectedAsset(valid[0]); }
      }
    } catch {}
  }, []);

  useEffect(() => { localStorage.setItem("pb-open-assets", JSON.stringify(openAssets)); }, [openAssets]);

  useEffect(() => {
    if (!openAssets.includes(selectedAsset) && openAssets.length > 0)
      setSelectedAsset(openAssets[0]);
  }, [openAssets, selectedAsset]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.metaKey || e.ctrlKey) return;
      switch (e.key.toLowerCase()) {
        case "u": if (canTrade) placeTrade("UP");   break;
        case "d": if (canTrade) placeTrade("DOWN"); break;
        case "1": setSelectedDuration(DURATIONS[0].value); break;
        case "2": setSelectedDuration(DURATIONS[1].value); break;
        case "3": setSelectedDuration(DURATIONS[2].value); break;
        case "4": setSelectedDuration(DURATIONS[3].value); break;
        case "5": setSelectedDuration(DURATIONS[4].value); break;
        case "escape":
          setResetModalOpen(false); setShowAssetPicker(false);
          setShowMobilePanel(false); setDepositModalOpen(false);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrice, balance, amount, placing]);

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
        const pv = prev[selectedAsset]?.price ?? 0;
        const nv = data[selectedAsset]?.price ?? 0;
        if (nv > 0 && pv > 0 && nv !== pv) {
          setPriceFlash(nv > pv ? "up" : "down");
          setTimeout(() => setPriceFlash(null), 600);
        }
        return data;
      });
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
      staleTimerRef.current = setTimeout(() => setPricesStale(true), 30_000);
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
    const d = setInterval(() => { fetchUser(); fetchTrades(); }, 15_000);
    return () => { clearInterval(p); clearInterval(d); };
  }, [status, fetchPrices, fetchUser, fetchTrades]);

  const handleSettle = useCallback(async (id: string, exitPrice: number) => {
    if (settlingRef.current.has(id)) return;
    settlingRef.current.add(id);
    try {
      const res = await fetch(`/api/trades/${id}/settle`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exitPrice }),
      });
      if (res.ok) {
        const settled = await res.json();
        setTrades((prev) => prev.map((t) => t.id === id ? { ...t, ...settled } : t));
        await fetchUser();
        showNotif(
          settled.result === "WIN"
            ? `🏆 Ganhou +$${settled.profit.toFixed(2)} em ${settled.asset}`
            : `💸 Perdeu -$${settled.amount.toFixed(2)} em ${settled.asset}`,
          settled.result === "WIN" ? "win" : "loss"
        );
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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset: selectedAsset, direction, amount, duration: selectedDuration }),
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
      if (res.ok) { setBalance(1000); setTrades([]); settlingRef.current.clear(); showNotif("✓ Saldo resetado", "win"); }
    } catch { showNotif("Erro", "error"); }
    finally { setResetting(false); setResetModalOpen(false); }
  }

  function addAsset(symbol: string) {
    if (!openAssets.includes(symbol)) setOpenAssets((p) => [...p, symbol]);
  }
  function removeAsset(symbol: string) {
    if (openAssets.length <= 1) return;
    setOpenAssets((p) => p.filter((a) => a !== symbol));
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#050509] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
            <span className="text-[#080c14] font-black text-sm">PB</span>
          </div>
          <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const canTrade       = currentPrice > 0 && !placing && balance !== null && balance >= amount && amount >= 1;
  const potentialWin   = amount * PAYOUT_RATE;
  const balanceFmt     = balance === null ? "…" : `$${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const assetInfo      = ALL_ASSETS.find((a) => a.symbol === selectedAsset);

  return (
    <div className="h-screen flex flex-col bg-[#050509] overflow-hidden">

      {/* ── TOAST ── */}
      <div className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${notification ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"}`}>
        {notification && (
          <div key={notification.key} className={`px-5 py-2.5 rounded-xl font-semibold text-sm shadow-2xl whitespace-nowrap border ${
            notification.type === "win"   ? "bg-emerald-500 border-emerald-400 text-white"
            : notification.type === "loss" ? "bg-rose-600 border-rose-500 text-white"
            : "bg-amber-500 border-amber-400 text-[#080c14]"
          }`}>{notification.msg}</div>
        )}
      </div>

      {/* ── MODALS ── */}
      <ConfirmModal open={resetModalOpen} title="Resetar saldo"
        message="Apaga todo o histórico e restaura o saldo para $1.000."
        confirmLabel={resetting ? "Resetando…" : "Resetar tudo"} danger
        onConfirm={handleReset} onCancel={() => setResetModalOpen(false)} />
      <DepositModal open={depositModalOpen} onClose={() => setDepositModalOpen(false)} />
      {showAssetPicker && (
        <AssetPicker assets={ALL_ASSETS} openAssets={openAssets} prices={prices}
          onAdd={addAsset} onRemove={removeAsset} onClose={() => setShowAssetPicker(false)} />
      )}

      {/* ── HEADER ── */}
      <header className="h-11 bg-[#0a0c14] border-b border-white/5 flex items-center px-3 gap-2 shrink-0 z-10">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-white/5">
          <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
            <span className="text-[#080c14] font-black text-[9px]">PB</span>
          </div>
          <span className="font-bold text-sm tracking-tight hidden sm:block">
            <span className="text-white">Prime</span><span className="text-amber-400"> Broker</span>
          </span>
        </div>

        {/* Asset tabs */}
        <div className="flex items-stretch overflow-x-auto scrollbar-hide flex-1 h-full">
          {openAssets.map((symbol) => {
            const p = prices[symbol];
            const info = ALL_ASSETS.find((a) => a.symbol === symbol);
            const sel  = selectedAsset === symbol;
            return (
              <button key={symbol} onClick={() => setSelectedAsset(symbol)}
                className={`group flex flex-col items-start justify-center px-2.5 h-full border-b-2 transition-all shrink-0 ${
                  sel ? "border-amber-400 bg-white/3" : "border-transparent hover:border-white/10 hover:bg-white/2"
                }`}
              >
                <div className="flex items-center gap-1">
                  <div className={`w-1 h-1 rounded-full ${info?.type === "forex" ? "bg-blue-400" : "bg-amber-400"}`} />
                  <span className={`text-[10px] font-semibold ${sel ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`}>{symbol}</span>
                  {openAssets.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); removeAsset(symbol); }}
                      className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-white/60 ml-0.5 text-[10px] leading-none">×</button>
                  )}
                </div>
                {p?.price ? (
                  <span className={`text-[8px] font-mono leading-none ${(p.change24h ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {p.change24h >= 0 ? "+" : ""}{p.change24h.toFixed(2)}%
                  </span>
                ) : <span className="text-[8px] text-white/10 animate-pulse">…</span>}
              </button>
            );
          })}
          <button onClick={() => setShowAssetPicker(true)}
            className="flex items-center justify-center w-8 h-full text-white/20 hover:text-amber-400 hover:bg-white/3 transition-all shrink-0 text-lg leading-none">
            +
          </button>
        </div>

        {/* Demo / Real / Deposit */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-white/5">
          {/* Demo pill */}
          <div className="hidden sm:flex items-center gap-2 bg-[#111827] border border-white/5 rounded-lg px-2.5 py-1.5 cursor-pointer hover:border-white/10 transition-all" onClick={() => setDepositModalOpen(true)}>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1">
                <span className="text-[7px] font-bold text-amber-400 uppercase tracking-wider">Demo</span>
                <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className={`text-xs font-bold font-mono ${balance === null ? "text-slate-700 animate-pulse" : "text-white"}`}>{balanceFmt}</span>
            </div>
          </div>
          <button onClick={() => setDepositModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-emerald-500/20">
            <span>💰</span> Depositar
          </button>
          <button onClick={() => setShowMobilePanel((v) => !v)} className="md:hidden p-2 text-white/30 hover:text-white transition-colors bg-white/3 border border-white/5 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5"/></svg>
          </button>
        </div>
      </header>

      {/* ── MAIN ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="w-[68px] bg-[#0a0c14] border-r border-white/5 flex-col items-center py-2 gap-0.5 shrink-0 hidden md:flex">
          <NavItem icon={<IcoTrade />}   label="Trade"     active={sidebarView === "trade"}   onClick={() => setSidebarView("trade")} />
          <NavItem icon={<IcoHistory />} label="Histórico" active={sidebarView === "history"} onClick={() => setSidebarView("history")} />
          <NavItem icon={<IcoTrophy />}  label="Ranking"   href="/dashboard/leaderboard" />
          <NavItem icon={<IcoStats />}   label="Análise"   active={sidebarView === "stats"}   onClick={() => setSidebarView("stats")} />
          <NavItem icon={<IcoPromo />}   label="Promoções" badge="1" onClick={() => setDepositModalOpen(true)} />
          <NavItem icon={<IcoSupport />} label="Suporte"   onClick={() => setDepositModalOpen(true)} />
          <div className="mt-auto flex flex-col gap-0.5 w-full">
            <NavItem icon={<IcoUser />}  label="Perfil"    href="/dashboard/profile" />
            <NavItem icon={<IcoReset />} label="Reset"     onClick={() => setResetModalOpen(true)} />
          </div>
        </aside>

        {/* ── CHART AREA ── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">

          {/* Chart top bar */}
          <div className="h-10 bg-[#0a0c14] border-b border-white/5 flex items-center px-4 gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${assetInfo?.type === "forex" ? "bg-blue-400" : "bg-amber-400"}`} />
              <span className="text-white text-sm font-bold">{selectedAsset}</span>
              <span className={`text-[10px] text-slate-500 ${assetInfo?.type === "forex" ? "" : ""}`}>{assetInfo?.name}</span>
              {change24h !== 0 && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  change24h >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
                }`}>
                  {change24h >= 0 ? "▲" : "▼"} {Math.abs(change24h).toFixed(2)}%
                </span>
              )}
              {pricesStale && <span className="text-[9px] text-amber-600 bg-amber-600/10 rounded px-1.5 py-0.5">⚠ estimado</span>}
            </div>

            {/* Price */}
            <div className={`text-base font-bold font-mono transition-colors duration-300 ${
              priceFlash === "up" ? "text-emerald-400" : priceFlash === "down" ? "text-rose-400" : "text-white"
            }`}>
              {currentPrice > 0 ? `$${formatPrice(currentPrice, selectedAsset)}` : <span className="text-white/10 animate-pulse">——</span>}
            </div>

            {/* Chart type toggle */}
            <div className="ml-auto flex items-center bg-white/3 border border-white/5 rounded-lg p-0.5 gap-0.5">
              {(["line", "candle"] as ChartType[]).map((t) => (
                <button key={t} onClick={() => setChartType(t)}
                  className={`px-2.5 py-1 rounded-md text-[9px] font-semibold transition-all ${chartType === t ? "bg-amber-400/15 text-amber-400" : "text-white/20 hover:text-white/50"}`}
                >
                  {t === "line" ? "⟆ Linha" : "◈ Velas"}
                </button>
              ))}
            </div>
          </div>

          {/* Chart + Sentiment overlay */}
          <div className="flex-1 min-h-0 relative">
            {currentPrice > 0
              ? <TradingChart currentPrice={currentPrice} asset={selectedAsset} chartType={chartType} activeEntries={activeEntries} onOhlcChange={setOhlc} />
              : (
                <div className="w-full h-full flex items-center justify-center bg-[#050509]">
                  <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
                </div>
              )}

            {/* BUY/SELL sentiment — overlaid on chart left */}
            {currentPrice > 0 && (
              <div className="absolute left-3 top-3 z-10 pointer-events-none">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 rounded-full bg-emerald-500" style={{ height: `${buySentiment * 0.7}px`, minHeight: "20px" }} />
                    <div>
                      <div className="text-emerald-400 text-[9px] font-black uppercase">BUY</div>
                      <div className="text-emerald-400 text-[10px] font-bold">{buySentiment}%</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 rounded-full bg-rose-500" style={{ height: `${(100 - buySentiment) * 0.7}px`, minHeight: "20px" }} />
                    <div>
                      <div className="text-rose-400 text-[9px] font-black uppercase">SELL</div>
                      <div className="text-rose-400 text-[10px] font-bold">{100 - buySentiment}%</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* OHLC bar (Avalon-style, bottom of chart) */}
          <div className="h-7 bg-[#050509] border-t border-white/3 flex items-center px-4 gap-4 shrink-0">
            {ohlc ? (
              <>
                {[
                  { label: "Open",  value: ohlc.open  },
                  { label: "High",  value: ohlc.high  },
                  { label: "Low",   value: ohlc.low   },
                  { label: "Close", value: ohlc.close },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-1">
                    <span className="text-[9px] text-white/20">{label}</span>
                    <span className="text-[9px] text-white/50 font-mono">{formatPrice(value, selectedAsset)}</span>
                  </div>
                ))}
              </>
            ) : (
              <span className="text-[9px] text-white/10">Passe o mouse sobre o gráfico para ver OHLC</span>
            )}
            {/* Ask/Bid in OHLC bar */}
            {currentPrice > 0 && (
              <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-white/20 uppercase">Ask</span>
                  <span className="text-[9px] text-emerald-400/70 font-mono">{formatPrice(askPrice, selectedAsset)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-white/20 uppercase">Bid</span>
                  <span className="text-[9px] text-rose-400/70 font-mono">{formatPrice(bidPrice, selectedAsset)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL (Avalon style) ── */}
        <div className={`bg-[#0a0c14] border-l border-white/5 flex flex-col shrink-0 w-[220px] ${showMobilePanel ? "absolute inset-0 z-30 w-full md:relative md:w-[220px]" : "hidden md:flex"}`}>

          {/* Mobile close */}
          <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-white/5">
            <span className="text-xs text-white/30">Painel</span>
            <button onClick={() => setShowMobilePanel(false)} className="text-white/30 hover:text-white p-1">✕</button>
          </div>

          {/* ── TRADE VIEW ── */}
          {sidebarView === "trade" && (
            <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
              <div className="p-3 space-y-3 shrink-0">

                {/* Asset header (Avalon style) */}
                <div className="bg-white/3 border border-white/5 rounded-xl px-3 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${assetInfo?.type === "forex" ? "bg-blue-400" : "bg-amber-400"}`} />
                    <div>
                      <div className="text-white text-xs font-bold">{selectedAsset}</div>
                      <div className="text-white/30 text-[9px]">Até {DURATIONS.find(d => d.value === selectedDuration)?.label ?? "…"}</div>
                    </div>
                  </div>
                  <div className={`text-[10px] font-bold ${change24h >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
                  </div>
                </div>

                {/* Sentiment bars (Avalon style) */}
                <div className="space-y-1.5">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-emerald-400 text-[9px] font-black uppercase">BUY</span>
                      <span className="text-emerald-400 text-[9px] font-bold">{buySentiment}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${buySentiment}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-rose-400 text-[9px] font-black uppercase">SELL</span>
                      <span className="text-rose-400 text-[9px] font-bold">{100 - buySentiment}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full transition-all duration-1000" style={{ width: `${100 - buySentiment}%` }} />
                    </div>
                  </div>
                </div>

                {/* Invest */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] text-white/30 uppercase tracking-widest font-semibold">Invest</span>
                    {balance !== null && <span className="text-[8px] text-white/20 font-mono">${balance.toFixed(2)}</span>}
                  </div>
                  <div className="flex items-center bg-white/3 border border-white/8 rounded-xl overflow-hidden focus-within:border-amber-500/30">
                    <button onClick={() => setAmount((a) => Math.max(1, a - 5))} className="w-8 h-9 text-white/30 hover:text-white hover:bg-white/5 transition-colors font-bold">−</button>
                    <input type="number" value={amount} onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))} min={1}
                      className="flex-1 bg-transparent text-center text-white text-sm font-mono focus:outline-none py-2 min-w-0" />
                    <button onClick={() => setAmount((a) => a + 5)} className="w-8 h-9 text-white/30 hover:text-white hover:bg-white/5 transition-colors font-bold">+</button>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mt-1.5">
                    {[25, 50, 75].map((p) => (
                      <button key={p} onClick={() => setAmount(Math.max(1, Math.floor((balance ?? 0) * (p / 100))))}
                        disabled={balance === null || balance < 1}
                        className="py-1 bg-white/3 border border-white/5 rounded-lg text-[8px] text-white/30 hover:text-white hover:border-white/10 transition-all disabled:opacity-20 font-semibold">
                        {p}%
                      </button>
                    ))}
                    <button onClick={() => setAmount(Math.max(1, Math.floor(balance ?? 0)))}
                      disabled={balance === null || balance < 1}
                      className="py-1 bg-amber-400/5 border border-amber-400/20 rounded-lg text-[8px] text-amber-500 hover:text-amber-400 hover:border-amber-400/40 transition-all disabled:opacity-20 font-bold">
                      MAX
                    </button>
                  </div>
                  {amount > (balance ?? 0) && balance !== null && (
                    <p className="text-rose-400 text-[9px] mt-1">Saldo insuficiente</p>
                  )}
                </div>

                {/* Expiration */}
                <div>
                  <div className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mb-1.5">Expiração</div>
                  <div className="grid grid-cols-5 gap-1">
                    {DURATIONS.map((d, i) => (
                      <button key={d.value} onClick={() => setSelectedDuration(d.value)}
                        title={`Tecla ${i + 1}`}
                        className={`py-1.5 rounded-lg text-[9px] font-bold transition-all ${
                          selectedDuration === d.value
                            ? "bg-amber-400/15 text-amber-400 border border-amber-400/30"
                            : "bg-white/3 text-white/30 border border-white/5 hover:border-white/10 hover:text-white/60"
                        }`}
                      >{d.label}</button>
                    ))}
                  </div>
                </div>

                {/* Profit */}
                <div className="bg-white/2 border border-white/5 rounded-xl px-3 py-2.5">
                  <div className="text-[9px] text-white/20 uppercase tracking-widest mb-1">Lucro</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-400">+{(PAYOUT_RATE * 100).toFixed(0)}%</span>
                    <span className="text-sm text-emerald-500 font-mono font-bold">+${potentialWin.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                    <div className="text-center">
                      <div className="text-[8px] text-emerald-600 mb-0.5">Ganhar</div>
                      <div className="text-xs text-emerald-400 font-mono font-bold">+${potentialWin.toFixed(2)}</div>
                    </div>
                    <div className="text-white/10 text-lg">|</div>
                    <div className="text-center">
                      <div className="text-[8px] text-rose-600 mb-0.5">Perder</div>
                      <div className="text-xs text-rose-400 font-mono font-bold">-${amount.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* BUY / SELL buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => placeTrade("UP")} disabled={!canTrade}
                    className="btn-up py-3 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-25 disabled:cursor-not-allowed text-white font-black flex flex-col items-center gap-0.5"
                  >
                    <span className="text-lg leading-none">▲</span>
                    <span className="text-xs tracking-wide">BUY</span>
                    {currentPrice > 0 && <span className="text-[8px] opacity-60 font-normal font-mono">{formatPrice(askPrice, selectedAsset)}</span>}
                  </button>
                  <button onClick={() => placeTrade("DOWN")} disabled={!canTrade}
                    className="btn-down py-3 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 disabled:opacity-25 disabled:cursor-not-allowed text-white font-black flex flex-col items-center gap-0.5"
                  >
                    <span className="text-lg leading-none">▼</span>
                    <span className="text-xs tracking-wide">SELL</span>
                    {currentPrice > 0 && <span className="text-[8px] opacity-60 font-normal font-mono">{formatPrice(bidPrice, selectedAsset)}</span>}
                  </button>
                </div>

                {placing && (
                  <div className="flex items-center justify-center gap-2 text-[10px] text-amber-400/70">
                    <div className="w-3 h-3 border border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
                    Abrindo operação…
                  </div>
                )}
              </div>

              {/* Mini stats */}
              {stats.settled > 0 && (
                <div className="mt-auto border-t border-white/5 p-3 shrink-0">
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "Win%",   value: `${stats.winRate.toFixed(0)}%`, ok: stats.winRate >= 50 },
                      { label: "P&L",    value: `${stats.pnl >= 0 ? "+" : ""}$${Math.abs(stats.pnl).toFixed(0)}`, ok: stats.pnl >= 0 },
                      { label: "Streak", value: stats.streak === 0 ? "—" : `${stats.streakType === "WIN" ? "🔥" : "❄️"}${stats.streak}`, ok: stats.streakType === "WIN" },
                    ].map(({ label, value, ok }) => (
                      <div key={label} className="bg-white/2 border border-white/5 rounded-xl p-2 text-center">
                        <div className="text-[7px] text-white/20 uppercase tracking-wide mb-0.5">{label}</div>
                        <div className={`text-[10px] font-bold ${ok ? "text-emerald-400" : "text-rose-400"}`}>{value}</div>
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
            <div className="flex-1 overflow-y-auto p-3 min-h-0 space-y-2">
              <div className="text-[9px] font-semibold text-white/20 uppercase tracking-widest mb-3">Estatísticas</div>
              {stats.settled === 0 ? (
                <p className="text-white/20 text-xs text-center py-8">Nenhuma operação finalizada</p>
              ) : (
                [
                  { label: "Operações",     value: String(stats.settled) },
                  { label: "Vitórias",      value: String(stats.wins),     color: "text-emerald-400" },
                  { label: "Derrotas",      value: String(stats.losses),   color: "text-rose-400" },
                  { label: "Win Rate",      value: `${stats.winRate.toFixed(1)}%`, color: stats.winRate >= 50 ? "text-emerald-400" : "text-rose-400" },
                  { label: "P&L Total",     value: `${stats.pnl >= 0 ? "+" : ""}$${stats.pnl.toFixed(2)}`, color: stats.pnl >= 0 ? "text-emerald-400" : "text-rose-400" },
                  { label: "Investido",     value: `$${stats.totalInvested.toFixed(2)}` },
                  { label: "Total Ganho",   value: `$${stats.totalProfit.toFixed(2)}`,  color: "text-emerald-400" },
                  { label: "Total Perdido", value: `-$${stats.totalLost.toFixed(2)}`,   color: "text-rose-400" },
                  { label: "Streak",        value: stats.streak === 0 ? "—" : `${stats.streakType === "WIN" ? "🔥" : "❄️"} ${stats.streak}x`, color: stats.streakType === "WIN" ? "text-emerald-400" : "text-rose-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/4">
                    <span className="text-[10px] text-white/30">{label}</span>
                    <span className={`text-[10px] font-bold font-mono ${color ?? "text-white"}`}>{value}</span>
                  </div>
                ))
              )}
              <button onClick={() => setResetModalOpen(true)}
                className="w-full mt-4 py-2.5 rounded-xl text-xs font-semibold text-rose-400/70 border border-rose-500/15 hover:bg-rose-500/8 transition-colors">
                ↺ Resetar conta
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="px-3 py-2.5 border-t border-white/5 flex items-center gap-2 shrink-0">
            <Link href="/dashboard/profile" className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-70 transition-opacity">
              <Avatar name={session?.user?.name ?? "?"} size="sm" />
              <div className="min-w-0">
                <div className="text-[9px] text-white/50 truncate">{session?.user?.name}</div>
                <div className="text-[7px] text-emerald-500">● Demo ativo</div>
              </div>
            </Link>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-[8px] text-white/20 hover:text-white/50 transition-colors">Sair</button>
          </div>
        </div>
      </div>

      {/* Hidden settlement */}
      <div className="sr-only" aria-hidden>
        <ActiveTrades trades={activeTrades} currentPrices={prices} onSettle={handleSettle} loading={false} />
      </div>

      {/* ── BOTTOM POSITIONS ── */}
      <div className={`shrink-0 border-t border-white/5 transition-all duration-300 ${positionsOpen ? "h-[140px]" : "h-9"} hidden md:block bg-[#0a0c14]`}>
        <div className="h-9 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold text-white/30 uppercase tracking-widest">Operações Abertas</span>
            {activeTrades.length > 0 && (
              <span className="bg-amber-400/10 text-amber-400 text-[8px] font-bold px-1.5 py-0.5 rounded-full">{activeTrades.length}</span>
            )}
          </div>
          <button onClick={() => setPositionsOpen((v) => !v)} className="text-white/20 hover:text-white/50 transition-colors text-[9px]">
            {positionsOpen ? "Ocultar ▲" : "Expandir ▼"}
          </button>
        </div>
        {positionsOpen && (
          <div className="h-[101px]">
            <PositionsTable trades={activeTrades} currentPrices={prices} />
          </div>
        )}
      </div>
    </div>
  );
}
