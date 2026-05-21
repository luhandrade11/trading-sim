"use client";

import { useEffect, useState, useCallback, useRef, useMemo, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import ActiveTrades from "@/components/ActiveTrades";
import TradeHistory from "@/components/TradeHistory";
import PositionsTable from "@/components/PositionsTable";
import ConfirmModal from "@/components/ConfirmModal";
import AssetPicker from "@/components/AssetPicker";
import type { TradeAnnotation } from "@/components/TradingChart";
import { PAYOUT_RATE, ALL_ASSETS, DEFAULT_TABS, DURATIONS, getSpread } from "@/lib/constants";
import { computeStats, formatPrice } from "@/lib/utils";
import { useI18n, LOCALES, setLocale as setGlobalLocale, formatCurrency } from "@/lib/i18n";
import type { Trade } from "@/types/trade";

const TradingChart = dynamic(() => import("@/components/TradingChart"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#050509]">
      <div className="w-5 h-5 border-2 border-white/20 border-t-amber-400/60 rounded-full animate-spin" />
    </div>
  ),
});

type ActivePanel = "history" | "ranking" | "analysis" | "promo" | "support" | "profile" | "withdrawal" | null;
type ChartType   = "candle" | "line";
interface PriceData { price: number; change24h: number }
interface Notification { msg: string; type: "win" | "loss" | "error"; key: number }
interface OhlcData { open: number; high: number; low: number; close: number }
interface TradeResult { profit: number; isWin: boolean; asset: string; amount: number }
interface LeaderRow { rank: number; id: string; display_name: string; wins: number; total_trades: number; win_rate: number; pnl: number }

// ─── Helpers ────────────────────────────────────────────────────────────────

function calcBuySentiment(asset: string, change24h: number): number {
  const seed  = asset.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 11 - 5;
  const trend = Math.min(15, Math.max(-15, change24h * 1.5));
  return Math.max(30, Math.min(70, Math.round(50 + trend + seed)));
}

function calcLevel(totalTrades: number): { level: number; label: string; emoji: string } {
  if (totalTrades >= 500) return { level: 10, label: "Lenda",     emoji: "👑" };
  if (totalTrades >= 200) return { level: 9,  label: "Mestre",    emoji: "🏆" };
  if (totalTrades >= 100) return { level: 8,  label: "Expert",    emoji: "⭐" };
  if (totalTrades >=  50) return { level: 7,  label: "Avançado",  emoji: "🔥" };
  if (totalTrades >=  25) return { level: 6,  label: "Veterano",  emoji: "💎" };
  if (totalTrades >=  10) return { level: 5,  label: "Trader",    emoji: "📈" };
  if (totalTrades >=   5) return { level: 4,  label: "Aprendiz",  emoji: "🎯" };
  if (totalTrades >=   2) return { level: 3,  label: "Novato",    emoji: "🌱" };
  if (totalTrades >=   1) return { level: 2,  label: "Iniciante", emoji: "🚀" };
  return                           { level: 1,  label: "Novo",      emoji: "✨" };
}

async function resizeImageToBase64(file: File, size = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const min = Math.min(img.width, img.height);
      const sx  = (img.width  - min) / 2;
      const sy  = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ─── Avatar ─────────────────────────────────────────────────────────────────

function Avatar({ name, image, size = "md", onClick }: {
  name: string; image?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl"; onClick?: () => void;
}) {
  const sz = { xs: "w-5 h-5 text-[7px]", sm: "w-6 h-6 text-[8px]", md: "w-8 h-8 text-[10px]", lg: "w-11 h-11 text-sm", xl: "w-16 h-16 text-xl" }[size];
  if (image) {
    return (
      <div className={`${sz} rounded-xl overflow-hidden shrink-0 ${onClick ? "cursor-pointer" : ""}`} onClick={onClick}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  const initial = name?.charAt(0).toUpperCase() ?? "?";
  return (
    <div
      onClick={onClick}
      className={`${sz} rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 font-black text-[#080c14] ${onClick ? "cursor-pointer hover:opacity-80" : ""}`}
    >
      {initial}
    </div>
  );
}

// ─── Icons ──────────────────────────────────────────────────────────────────

const IcoHistory  = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
const IcoTrophy   = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>;
const IcoStats    = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>;
const IcoPromo    = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>;
const IcoUser     = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>;
const IcoReset    = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>;
const IcoSupport  = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"/></svg>;
const IcoDeposit  = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
const IcoCash     = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>;

// ─── NavItem ────────────────────────────────────────────────────────────────

function NavItem({ icon, label, active = false, badge, onClick }: {
  icon: React.ReactNode; label: string; active?: boolean; badge?: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-2 w-full py-4 transition-all cursor-pointer select-none ${
        active ? "text-amber-400 bg-amber-400/10" : "text-slate-500 hover:text-slate-200 hover:bg-white/4"
      }`}
    >
      <div className="relative [&>svg]:w-6 [&>svg]:h-6">
        {icon}
        {badge && (
          <span className="absolute -top-2 -right-2 bg-amber-400 text-[#080c14] text-[8px] font-black px-1.5 rounded-full leading-tight min-w-[16px] text-center">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-bold leading-none tracking-wide uppercase">{label}</span>
      {active && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-amber-400 rounded-l-full" />}
    </button>
  );
}

// ─── Trade P&L annotation badges ────────────────────────────────────────────

function TradeAnnotations({ trades, prices, asset }: {
  trades: Trade[]; prices: Record<string, PriceData>; asset: string;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);

  const current = prices[asset]?.price ?? 0;
  const assetTrades = trades.filter((t) => t.asset === asset && t.result === "PENDING" && current > 0);
  if (!assetTrades.length) return null;

  return (
    <div className="absolute right-14 top-3 z-10 flex flex-col gap-1.5 pointer-events-none">
      {assetTrades.map((trade) => {
        const isWin    = trade.direction === "UP" ? current >= trade.entryPrice : current <= trade.entryPrice;
        const pnl      = isWin ? trade.amount * PAYOUT_RATE : -trade.amount;
        const timeLeft = Math.max(0, Math.ceil((new Date(trade.expiresAt).getTime() - Date.now()) / 1000));
        return (
          <div key={trade.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black text-white shadow-lg border ${
              isWin
                ? "bg-emerald-500/90 border-emerald-400/40 shadow-emerald-500/40"
                : "bg-rose-500/90 border-rose-400/40 shadow-rose-500/40"
            }`}
          >
            <span>{trade.direction === "UP" ? "▲" : "▼"}</span>
            <span>{pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}</span>
            <span className="text-[9px] opacity-60 font-normal">{timeLeft}s</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Chart loading overlay ───────────────────────────────────────────────────

const LOADING_STEPS = [
  "Conectando ao servidor de dados…",
  "Carregando histórico de preços…",
  "Sincronizando feed em tempo real…",
  "Calibrando indicadores…",
];

function ChartLoadingOverlay({ asset }: { asset: string }) {
  const [step, setStep] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1),  700),
      setTimeout(() => setStep(2), 1500),
      setTimeout(() => setStep(3), 2300),
      setTimeout(() => setFadeOut(true), 2800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-[#050509] transition-opacity duration-500"
      style={{ opacity: fadeOut ? 0 : 1, pointerEvents: fadeOut ? "none" : "auto" }}
    >
      {/* Logo */}
      <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/20">
        <span className="text-[#080c14] font-black text-base">PB</span>
      </div>

      {/* Asset name */}
      <div className="text-center">
        <div className="text-white font-black text-lg tracking-tight">{asset}</div>
        <div className="text-white/30 text-xs mt-0.5">Carregando gráfico</div>
      </div>

      {/* Steps */}
      <div className="flex flex-col items-start gap-2 min-w-[220px]">
        {LOADING_STEPS.map((s, i) => (
          <div key={i} className={`flex items-center gap-2 text-xs transition-all duration-300 ${i <= step ? "opacity-100" : "opacity-0"}`}>
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
              i < step ? "bg-emerald-500/20" : i === step ? "bg-amber-400/20 animate-pulse" : "bg-white/5"
            }`}>
              {i < step
                ? <svg className="w-2 h-2 text-emerald-400" fill="currentColor" viewBox="0 0 12 12"><path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
                : <div className={`w-1.5 h-1.5 rounded-full ${i === step ? "bg-amber-400" : "bg-white/10"}`} />
              }
            </div>
            <span className={i < step ? "text-white/50" : i === step ? "text-white/80" : "text-white/20"}>{s}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-48 h-0.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${((step + 1) / LOADING_STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── Trade result overlay ────────────────────────────────────────────────────

function TradeResultOverlay({ result, onDone }: { result: TradeResult; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);

  const isWin = result.isWin;
  return (
    <div className={`absolute inset-0 z-40 flex items-center justify-center pointer-events-none ${
      isWin ? "bg-emerald-950/30" : "bg-rose-950/30"
    }`}>
      <div className="result-anim flex flex-col items-center gap-3 text-center">
        <div className="text-6xl">{isWin ? "🏆" : "💸"}</div>
        <div className={`text-4xl font-black ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
          {isWin ? "+" : "-"}{formatCurrency(Math.abs(result.profit))}
        </div>
        <div className={`text-lg font-bold tracking-widest uppercase ${isWin ? "text-emerald-300" : "text-rose-300"}`}>
          {isWin ? "VITÓRIA!" : "PERDEU"}
        </div>
        <div className="text-xs text-white/30">{result.asset}</div>
      </div>
    </div>
  );
}

// ─── Left overlay panels ─────────────────────────────────────────────────────

function PanelWrap({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="panel-slide-in absolute left-0 top-0 bottom-0 w-[300px] sm:w-[320px] z-20 bg-[#0a0c14] border-r border-white/10 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
        <span className="text-sm font-bold text-white">{title}</span>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function HistoryPanel({ trades, loading, onClose }: { trades: Trade[]; loading: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [page, setPage] = useState(20);
  const settled = trades.filter((t) => t.result !== "PENDING");
  return (
    <PanelWrap title={t("history")} onClose={onClose}>
      {loading ? (
        <div className="flex items-center justify-center h-24 text-white/20 text-sm">{t("loading")}</div>
      ) : settled.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 gap-3">
          <span className="text-4xl">📊</span>
          <p className="text-white/20 text-sm">{t("history_empty")}</p>
        </div>
      ) : (
        <div className="p-3 space-y-1.5">
          {settled.slice(0, page).map((tr) => {
            const isWin = tr.result === "WIN";
            return (
              <div key={tr.id} className="flex items-center justify-between py-2.5 px-3 bg-white/2 border border-white/5 rounded-xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${isWin ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                    {tr.direction === "UP" ? "▲" : "▼"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{tr.asset}</div>
                    <div className="text-[9px] text-white/30">{new Date(tr.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-xs font-bold font-mono ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                    {isWin ? "+" : "-"}{formatCurrency(Math.abs(tr.profit))}
                  </div>
                  <div className={`text-[9px] font-semibold ${isWin ? "text-emerald-600" : "text-rose-600"}`}>
                    {isWin ? "WIN" : "LOSS"}
                  </div>
                </div>
              </div>
            );
          })}
          {settled.length > page && (
            <button onClick={() => setPage((p) => p + 20)}
              className="w-full py-2.5 text-xs text-white/30 hover:text-white border border-white/5 rounded-xl transition-colors">
              {t("load_more")}
            </button>
          )}
        </div>
      )}
    </PanelWrap>
  );
}

function RankingPanel({ onClose, currentUserId }: { onClose: () => void; currentUserId?: string }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/leaderboard").then((r) => r.json()).then((d) => { setRows(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  return (
    <PanelWrap title={t("ranking_title")} onClose={onClose}>
      <div className="p-3">
        {loading ? (
          <div className="flex items-center justify-center h-24 text-white/20 text-sm">{t("loading")}</div>
        ) : rows.length === 0 ? (
          <p className="text-white/20 text-sm text-center py-8">Nenhum trader ainda</p>
        ) : (
          <div className="space-y-1.5">
            {rows.slice(0, 3).length >= 3 && (
              <div className="flex items-end justify-center gap-2 py-4">
                {[rows[1], rows[0], rows[2]].map((row, i) => {
                  const heights = ["h-14", "h-20", "h-12"];
                  const medals  = ["🥈", "🥇", "🥉"];
                  return (
                    <div key={row.id} className="flex flex-col items-center gap-1">
                      <div className={`text-${i === 1 ? "xl" : "base"}`}>{medals[i]}</div>
                      <div className="text-[9px] text-white/50 truncate w-12 text-center">{row.display_name}</div>
                      <div className={`w-12 ${heights[i]} bg-white/5 border border-white/10 rounded-t-lg flex items-center justify-center`}>
                        <span className="text-[9px] text-emerald-400 font-mono">+{formatCurrency(row.pnl)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {rows.map((row) => {
              const isMe = row.id === currentUserId;
              return (
                <div key={row.id} className={`flex items-center gap-2 py-2.5 px-3 rounded-xl border transition-colors ${isMe ? "bg-amber-400/5 border-amber-400/20" : "bg-white/2 border-white/5"}`}>
                  <span className="text-xs font-mono w-5 text-center text-white/30">
                    {row.rank <= 3 ? ["🥇","🥈","🥉"][row.rank - 1] : row.rank}
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[8px] font-black text-[#080c14] shrink-0">
                    {row.display_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {row.display_name}{isMe && <span className="ml-1 text-[9px] text-amber-400">(você)</span>}
                    </div>
                    <div className="w-full bg-white/8 rounded-full h-0.5 mt-1">
                      <div className="h-0.5 rounded-full bg-emerald-500" style={{ width: `${row.win_rate}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-xs font-bold font-mono ${row.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {row.pnl >= 0 ? "+" : ""}{formatCurrency(row.pnl)}
                    </div>
                    <div className="text-[9px] text-white/30">{row.win_rate}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PanelWrap>
  );
}

function StatsPanel({ trades, onClose, onReset }: { trades: Trade[]; onClose: () => void; onReset: () => void }) {
  const { t } = useI18n();
  const stats = computeStats(trades);
  return (
    <PanelWrap title={t("analysis")} onClose={onClose}>
      <div className="p-3 space-y-1.5">
        {stats.settled === 0 ? (
          <p className="text-white/20 text-sm text-center py-8">{t("history_empty")}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {[
                { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%`, ok: stats.winRate >= 50, big: true },
                { label: "P&L Total", value: `${stats.pnl >= 0 ? "+" : ""}${formatCurrency(stats.pnl)}`, ok: stats.pnl >= 0, big: true },
              ].map(({ label, value, ok }) => (
                <div key={label} className="bg-white/3 border border-white/8 rounded-xl p-3 text-center">
                  <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">{label}</div>
                  <div className={`text-xl font-black ${ok ? "text-emerald-400" : "text-rose-400"}`}>{value}</div>
                </div>
              ))}
            </div>
            {[
              { label: "Operações", value: String(stats.settled) },
              { label: "Vitórias",  value: String(stats.wins),   color: "text-emerald-400" },
              { label: "Derrotas",  value: String(stats.losses), color: "text-rose-400" },
              { label: "Investido", value: formatCurrency(stats.totalInvested) },
              { label: "Ganho",     value: formatCurrency(stats.totalProfit),   color: "text-emerald-400" },
              { label: "Perdido",   value: formatCurrency(stats.totalLost),     color: "text-rose-400" },
              { label: "Streak",    value: stats.streak === 0 ? "—" : `${stats.streakType === "WIN" ? "🔥" : "❄️"} ${stats.streak}x`,
                color: stats.streakType === "WIN" ? "text-emerald-400" : "text-rose-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-xs text-white/30">{label}</span>
                <span className={`text-xs font-bold font-mono ${color ?? "text-white"}`}>{value}</span>
              </div>
            ))}
            <button onClick={onReset} className="w-full mt-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400/70 border border-rose-500/15 hover:bg-rose-500/8 transition-colors">
              ↺ {t("reset")}
            </button>
          </>
        )}
      </div>
    </PanelWrap>
  );
}

function PromoPanel({ onClose, onDeposit }: { onClose: () => void; onDeposit: () => void }) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  return (
    <PanelWrap title={t("promo_title")} onClose={onClose}>
      <div className="p-3 space-y-3">
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">⚡</span>
            <div>
              <div className="text-sm font-bold text-amber-400">100% de Bônus</div>
              <div className="text-[10px] text-white/40">Em depósitos acima de $20</div>
            </div>
          </div>
          <div className="text-[10px] text-white/30 mb-3">Válido até 8 Jun 2026 · Código: <span className="text-amber-400 font-mono">COPA100K</span></div>
          <button onClick={onDeposit} className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-[#080c14] font-bold rounded-xl text-sm transition-colors">
            🚀 Ativar Bônus
          </button>
        </div>
        <div className="rounded-xl border border-white/8 p-4">
          <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">{t("promo_code")}</div>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Digite o código…"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:border-amber-400/40 transition-colors" />
            <button onClick={() => setCode("")} className="px-3 py-2 bg-amber-400/15 hover:bg-amber-400/25 text-amber-400 font-bold rounded-lg text-sm transition-colors">OK</button>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
          <span className="text-2xl">💎</span>
          <div className="flex-1">
            <div className="text-sm font-bold text-white">Conta Real</div>
            <div className="text-[10px] text-white/30">Bônus só válido em conta real</div>
          </div>
          <button onClick={onDeposit} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg text-xs transition-colors">
            {t("deposit_cta")}
          </button>
        </div>
      </div>
    </PanelWrap>
  );
}

function SupportPanel({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const faqs = [
    { q: "Como funciona a conta demo?", a: "A conta demo tem $10.000 virtuais para você praticar sem risco. Quando zerar, reseta automaticamente." },
    { q: "Como faço um depósito?", a: "Clique em 'Depositar' no topo da tela. Aceitamos cartão de crédito via Stripe, PIX e transferência bancária." },
    { q: "Em quanto tempo cai o saque?", a: "Saques são processados em até 24h úteis após aprovação. PIX pode ser instantâneo." },
    { q: "O que é spread bid/ask?", a: "É a diferença entre preço de compra e venda. Usamos spreads reais de mercado por ativo." },
    { q: "Como funciona o payout de 85%?", a: "Se você acertar a direção do ativo na expiração, recebe 85% de lucro sobre o valor investido." },
  ];

  return (
    <PanelWrap title={t("support_title")} onClose={onClose}>
      <div className="p-3 space-y-3">
        <div>
          <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">{t("faq")}</div>
          {faqs.map((faq, i) => (
            <div key={i} className="border border-white/5 rounded-xl mb-1.5 overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/3 transition-colors">
                <span className="text-xs font-semibold text-white/70">{faq.q}</span>
                <span className="text-white/30 text-xs">{open === i ? "▲" : "▼"}</span>
              </button>
              {open === i && (
                <div className="px-3 pb-3 text-xs text-white/40 leading-relaxed border-t border-white/5">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
        <div>
          <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">{t("send_msg")}</div>
          {sent ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <span className="text-3xl">✅</span>
              <p className="text-emerald-400 text-sm font-semibold">{t("sent_ok")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("your_email")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:border-white/20 transition-colors" />
              <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={t("your_msg")} rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:border-white/20 transition-colors resize-none" />
              <button onClick={() => { if (msg.trim() && email.trim()) setSent(true); }}
                disabled={!msg.trim() || !email.trim()}
                className="w-full py-2.5 bg-amber-400/15 hover:bg-amber-400/25 text-amber-400 font-bold rounded-xl text-sm transition-colors disabled:opacity-30">
                {t("send_btn")}
              </button>
            </div>
          )}
        </div>
      </div>
    </PanelWrap>
  );
}

function ProfilePanel({ session: sess, balance, trades, onClose, onPhotoUpdate }: {
  session: { user: { id: string; name?: string | null; email?: string | null } } | null;
  balance: number | null; trades: Trade[]; onClose: () => void;
  onPhotoUpdate: (img: string) => void;
}) {
  const { t, setLocale: setL, getLocale, LOCALES: locs } = useI18n();
  const [name, setName]     = useState(sess?.user?.name ?? "");
  const [currPw, setCurrPw] = useState("");
  const [newPw, setNewPw]   = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");
  const [photo, setPhoto]   = useState<string | null>(null);
  const fileRef             = useRef<HTMLInputElement>(null);
  const stats               = computeStats(trades);
  const lvl                 = calcLevel(stats.settled);

  async function handleSave() {
    setSaving(true); setMsg("");
    const body: Record<string, unknown> = {};
    if (name !== sess?.user?.name) body.name = name;
    if (newPw) { body.newPassword = newPw; body.currentPassword = currPw; }
    if (photo) body.image = photo;
    if (!Object.keys(body).length) { setSaving(false); return; }
    const res = await fetch("/api/user/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) {
      setMsg("✓ Salvo!");
      if (photo) onPhotoUpdate(photo);
      setPhoto(null); setCurrPw(""); setNewPw("");
    } else { setMsg(data.error ?? "Erro"); }
    setSaving(false);
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await resizeImageToBase64(file, 128);
    setPhoto(b64);
  }

  return (
    <PanelWrap title={t("profile_title")} onClose={onClose}>
      <div className="p-4 space-y-4">
        {/* Avatar + Level */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="relative">
            <Avatar name={name || "?"} image={photo ?? undefined} size="xl" onClick={() => fileRef.current?.click()} />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#0a0c14] border border-white/10 rounded-lg flex items-center justify-center text-sm cursor-pointer hover:bg-white/10 transition-colors" onClick={() => fileRef.current?.click()}>
              📷
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          <div className="text-center">
            <div className="text-base font-bold text-white">{sess?.user?.name}</div>
            <div className="text-xs text-white/30">{sess?.user?.email}</div>
          </div>
          <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-1.5">
            <span className="text-base">{lvl.emoji}</span>
            <div>
              <div className="text-xs font-bold text-amber-400">{t("level")} {lvl.level} — {lvl.label}</div>
              <div className="text-[9px] text-white/30">{stats.settled} {t("trades_count")}</div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: "Win%", value: `${stats.winRate.toFixed(0)}%`, ok: stats.winRate >= 50 },
            { label: "P&L",  value: `${stats.pnl >= 0 ? "+" : ""}${formatCurrency(Math.abs(stats.pnl))}`, ok: stats.pnl >= 0 },
            { label: balance !== null ? formatCurrency(balance) : "…", value: t("balance_label"), ok: true },
          ].map(({ label, value, ok }) => (
            <div key={label} className="bg-white/3 border border-white/8 rounded-xl p-2 text-center">
              <div className={`text-sm font-black ${ok ? "text-emerald-400" : "text-rose-400"}`}>{label}</div>
              <div className="text-[9px] text-white/30 mt-0.5">{value}</div>
            </div>
          ))}
        </div>

        {/* Name */}
        <div>
          <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-1.5">{t("name_label")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:border-amber-400/30 transition-colors" />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block">{t("pw_label")}</label>
          <input value={currPw} onChange={(e) => setCurrPw(e.target.value)} type="password" placeholder={t("curr_pw")}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:border-amber-400/30 transition-colors" />
          <input value={newPw} onChange={(e) => setNewPw(e.target.value)} type="password" placeholder={t("new_pw")}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:border-amber-400/30 transition-colors" />
        </div>

        {/* Language */}
        <div>
          <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-1.5">Idioma / Language</label>
          <div className="grid grid-cols-3 gap-1">
            {locs.map((loc) => (
              <button key={loc.code} onClick={() => setL(loc.code)}
                className={`py-1.5 px-2 rounded-lg text-[9px] font-semibold transition-all border flex items-center gap-1 justify-center ${
                  getLocale() === loc.code
                    ? "bg-amber-400/15 text-amber-400 border-amber-400/30"
                    : "bg-white/3 text-white/30 border-white/8 hover:border-white/15 hover:text-white/60"
                }`}
              >
                <span>{loc.flag}</span> {loc.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {msg && <p className={`text-xs text-center font-semibold ${msg.startsWith("✓") ? "text-emerald-400" : "text-rose-400"}`}>{msg}</p>}

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-[#080c14] font-black rounded-xl text-sm transition-all disabled:opacity-40">
          {saving ? "…" : t("save")}
        </button>

        <button onClick={() => signOut({ callbackUrl: "/login" })} className="w-full py-2 text-xs text-white/20 hover:text-white/50 transition-colors border border-white/5 rounded-xl">
          {t("logout")}
        </button>
      </div>
    </PanelWrap>
  );
}

function WithdrawalPanel({ balance, onClose }: { balance: number | null; onClose: () => void }) {
  const { t, formatCurrency: fmt } = useI18n();
  const [amount, setAmount]   = useState(50);
  const [method, setMethod]   = useState("pix");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]       = useState(false);
  const [err, setErr]         = useState("");

  const methods = [
    { id: "pix",   label: "PIX",   icon: "⚡" },
    { id: "bank",  label: "Banco", icon: "🏦" },
    { id: "usdt",  label: "USDT",  icon: "₮"  },
  ];

  async function handleSubmit() {
    setErr(""); setSubmitting(true);
    const res = await fetch("/api/user/withdrawal", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, method, details }),
    });
    const data = await res.json();
    if (res.ok) setDone(true);
    else setErr(data.error ?? "Erro");
    setSubmitting(false);
  }

  return (
    <PanelWrap title={t("withdraw_title")} onClose={onClose}>
      <div className="p-4 space-y-4">
        {done ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <span className="text-5xl">✅</span>
            <p className="text-emerald-400 font-bold text-sm text-center">Solicitação enviada!<br/>Processamos em até 24h úteis.</p>
            <button onClick={() => setDone(false)} className="text-xs text-white/30 hover:text-white/60 mt-2">Nova solicitação</button>
          </div>
        ) : (
          <>
            <div className="bg-amber-400/5 border border-amber-400/15 rounded-xl p-3 text-xs text-amber-400/70">
              ⚠️ {t("withdraw_real_only")}
            </div>

            <div>
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-2">{t("amount_label")}</label>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-amber-400/30 transition-colors">
                <button onClick={() => setAmount((a) => Math.max(10, a - 10))} className="w-10 h-10 text-white/30 hover:text-white hover:bg-white/5 transition-colors font-bold text-lg">−</button>
                <input type="number" value={amount} onChange={(e) => setAmount(Math.max(10, Number(e.target.value)))}
                  className="flex-1 bg-transparent text-center text-white text-sm font-mono focus:outline-none" />
                <button onClick={() => setAmount((a) => a + 10)} className="w-10 h-10 text-white/30 hover:text-white hover:bg-white/5 transition-colors font-bold text-lg">+</button>
              </div>
              <p className="text-[9px] text-white/20 mt-1">{t("withdraw_min")} · {t("balance_label")}: {fmt(balance ?? 0)}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-2">{t("method_label")}</label>
              <div className="grid grid-cols-3 gap-1.5">
                {methods.map((m) => (
                  <button key={m.id} onClick={() => setMethod(m.id)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-1 ${
                      method === m.id ? "bg-amber-400/15 text-amber-400 border-amber-400/30" : "bg-white/3 text-white/40 border-white/8 hover:border-white/15"
                    }`}
                  >
                    <span className="text-base">{m.icon}</span>{m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-2">{t("details_label")}</label>
              <input value={details} onChange={(e) => setDetails(e.target.value)}
                placeholder={method === "pix" ? "Chave PIX (CPF/email/telefone)" : method === "usdt" ? "Endereço da carteira" : "Banco, agência e conta"}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:border-amber-400/30 transition-colors" />
            </div>

            {err && <p className="text-rose-400 text-xs">{err}</p>}

            <button onClick={handleSubmit} disabled={submitting || amount < 10 || !details.trim()}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black rounded-xl text-sm transition-all disabled:opacity-30">
              {submitting ? "…" : t("submit_withdraw")}
            </button>
          </>
        )}
      </div>
    </PanelWrap>
  );
}

function DepositModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [amount, setAmount]     = useState(50);
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState("");
  const presets                 = [20, 50, 100, 200, 500];

  async function handleStripe() {
    setLoading(true); setErr("");
    const res  = await fetch("/api/stripe/create-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }) });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { setErr(data.error ?? "Erro ao criar sessão"); setLoading(false); }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0d1117] border border-[#1e2a42] rounded-2xl p-6 w-full max-w-sm card-shadow">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-xl">💰</div>
          <div>
            <h3 className="text-white font-bold">{t("deposit_title")}</h3>
            <p className="text-xs text-white/30">{t("deposit_sub")}</p>
          </div>
        </div>

        <div className="bg-amber-400/5 border border-amber-400/15 rounded-xl p-3 mb-4 text-xs text-amber-400/70">
          ⭐ {t("deposit_demo_note")}
        </div>

        <div className="mb-3">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Valor do depósito (USD)</div>
          <div className="grid grid-cols-5 gap-1.5 mb-2">
            {presets.map((p) => (
              <button key={p} onClick={() => setAmount(p)}
                className={`py-2 rounded-lg text-xs font-bold transition-all border ${amount === p ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-white/3 text-white/40 border-white/8 hover:border-white/15"}`}>
                ${p}
              </button>
            ))}
          </div>
          <input type="number" value={amount} onChange={(e) => setAmount(Math.max(10, Number(e.target.value)))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-400/30 transition-colors" />
        </div>

        {err && <p className="text-rose-400 text-xs mb-3">{err}</p>}

        <div className="space-y-2">
          <button onClick={handleStripe} disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-40">
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>💳</span>}
            Pagar com Stripe — ${amount}
          </button>
          <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 border border-white/10 hover:border-white/20 text-white/50 hover:text-white font-semibold rounded-xl text-sm transition-all">
            <span>📱</span> {t("contact_support")}
          </a>
          <button onClick={onClose} className="w-full py-2 text-xs text-white/20 hover:text-white/50 transition-colors">
            {t("continue_demo")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Deposit success handler (needs Suspense for useSearchParams) ─────────────

function DepositSuccessHandler({ onSuccess, onVerified }: { onSuccess: () => void; onVerified: () => void }) {
  const searchParams = useSearchParams();
  const router       = useRouter();
  useEffect(() => {
    if (searchParams?.get("deposit") === "success") {
      onSuccess();
      router.replace("/dashboard");
    }
    if (searchParams?.get("verified") === "1") {
      onVerified();
      router.replace("/dashboard");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ─── Main dashboard ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t }        = useI18n();

  const [openAssets,       setOpenAssets]       = useState<string[]>(DEFAULT_TABS);
  const [selectedAsset,    setSelectedAsset]    = useState<string>(DEFAULT_TABS[0]);
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [amount,           setAmount]           = useState(10);
  const [prices,           setPrices]           = useState<Record<string, PriceData>>({});
  const [pricesStale,      setPricesStale]      = useState(false);
  const [balance,          setBalance]          = useState<number | null>(null);
  const [userImage,        setUserImage]        = useState<string | null>(null);
  const [trades,           setTrades]           = useState<Trade[]>([]);
  const [tradesLoading,    setTradesLoading]    = useState(true);
  const [placing,          setPlacing]          = useState(false);
  const [notification,     setNotification]     = useState<Notification | null>(null);
  const [activePanel,      setActivePanel]      = useState<ActivePanel>(null);
  const [chartType,        setChartType]        = useState<ChartType>("line");
  const [positionsOpen,    setPositionsOpen]    = useState(true);
  const [showAssetPicker,  setShowAssetPicker]  = useState(false);
  const [priceFlash,       setPriceFlash]       = useState<"up" | "down" | null>(null);
  const [resetModalOpen,   setResetModalOpen]   = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [resetting,        setResetting]        = useState(false);
  const [ohlc,             setOhlc]             = useState<OhlcData | null>(null);
  const [tradeResult,      setTradeResult]      = useState<TradeResult | null>(null);
  const [mobileTab,        setMobileTab]        = useState<"chart" | "trade" | "panels">("chart");
  const [emailVerified,    setEmailVerified]    = useState<boolean | null>(null);
  const [showDepositCta,   setShowDepositCta]   = useState(false);
  const [chartLoading,     setChartLoading]     = useState(true);
  const chartLoadTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevAssetRef       = useRef<string>("");

  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settlingRef   = useRef<Set<string>>(new Set());

  const activeTrades  = trades.filter((t) => t.result === "PENDING");
  const stats         = useMemo(() => computeStats(trades), [trades]);
  const currentPrice  = prices[selectedAsset]?.price ?? 0;
  const change24h     = prices[selectedAsset]?.change24h ?? 0;
  const buySentiment  = useMemo(() => calcBuySentiment(selectedAsset, change24h), [selectedAsset, change24h]);
  const spread        = getSpread(selectedAsset);
  const askPrice      = currentPrice > 0 ? currentPrice * (1 + spread) : 0;
  const bidPrice      = currentPrice > 0 ? currentPrice * (1 - spread) : 0;
  const assetInfo     = ALL_ASSETS.find((a) => a.symbol === selectedAsset);
  const potentialWin  = amount * PAYOUT_RATE;
  const canTrade      = currentPrice > 0 && !placing && balance !== null && balance >= amount && amount >= 1;

  const activeTradesForChart = useMemo(
    () => activeTrades
      .filter((t) => t.asset === selectedAsset)
      .map((t): TradeAnnotation => ({
        id:         t.id,
        entryPrice: t.entryPrice,
        direction:  t.direction as "UP" | "DOWN",
        expiresAt:  t.expiresAt,
        createdAt:  t.createdAt,
        amount:     t.amount,
      })),
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
  useEffect(() => { if (!openAssets.includes(selectedAsset) && openAssets.length > 0) setSelectedAsset(openAssets[0]); }, [openAssets, selectedAsset]);
  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  // Chart loading overlay — 3s on initial load + every asset switch
  useEffect(() => {
    if (prevAssetRef.current === selectedAsset) return;
    prevAssetRef.current = selectedAsset;
    setChartLoading(true);
    if (chartLoadTimerRef.current) clearTimeout(chartLoadTimerRef.current);
    chartLoadTimerRef.current = setTimeout(() => setChartLoading(false), 3100);
    return () => { if (chartLoadTimerRef.current) clearTimeout(chartLoadTimerRef.current); };
  }, [selectedAsset]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.metaKey || e.ctrlKey) return;
      switch (e.key.toLowerCase()) {
        case "u": if (canTrade) placeTrade("UP");   break;
        case "d": if (canTrade) placeTrade("DOWN"); break;
        case "1": case "2": case "3": case "4": case "5":
          setSelectedDuration(DURATIONS[Number(e.key) - 1]?.value ?? 5); break;
        case "escape": setResetModalOpen(false); setShowAssetPicker(false); setActivePanel(null); setDepositModalOpen(false); break;
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
        const pv = prev[selectedAsset]?.price ?? 0, nv = data[selectedAsset]?.price ?? 0;
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

  const fetchUser = useCallback(async () => {
    try {
      const r = await fetch("/api/user");
      if (r.ok) {
        const u = await r.json();
        setBalance(u.balance);
        if (u.image) setUserImage(u.image);
        if (typeof u.emailVerified === "boolean") setEmailVerified(u.emailVerified);
        // Show deposit CTA once if first time seeing demo balance
        if (u.balance !== null && u.balance >= 9900) {
          const ctaDismissed = localStorage.getItem("pb-deposit-cta-dismissed");
          if (!ctaDismissed) setShowDepositCta(true);
        }
        // Auto-reset demo balance when depleted
        if (u.balance !== null && u.balance <= 0) {
          const rr = await fetch("/api/user/reset", { method: "POST" });
          if (rr.ok) {
            const rd = await rr.json();
            setBalance(rd.balance);
            showNotif("✨ Saldo demo reposto para $10.000!", "win");
          }
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const p = setInterval(fetchPrices,  5_000);
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
        const isWin = settled.result === "WIN";
        // For WIN: settled.profit = amount * PAYOUT_RATE; for LOSS: profit=0 in DB, so show amount
        setTradeResult({ profit: isWin ? settled.profit : settled.amount, isWin, asset: settled.asset, amount: settled.amount });
        showNotif(
          isWin
            ? `${t("win_notif")} +${formatCurrency(settled.profit)} em ${settled.asset}`
            : `${t("loss_notif")} -${formatCurrency(settled.amount)} em ${settled.asset}`,
          isWin ? "win" : "loss"
        );
      }
    } catch { showNotif(t("conn_error"), "error"); }
  }, [fetchUser, showNotif, t]);

  async function placeTrade(direction: "UP" | "DOWN") {
    if (!currentPrice || placing) return;
    if (balance === null) { showNotif(t("loading"), "error"); return; }
    if (amount > balance)  { showNotif(t("insufficient"), "error"); return; }
    if (amount < 1)        { showNotif(t("min_amount"), "error"); return; }
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
    } catch { showNotif(t("conn_error"), "error"); }
    finally { setPlacing(false); }
  }

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch("/api/user/reset", { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setBalance(d.balance);
        setTrades([]);
        settlingRef.current.clear();
        showNotif(`✓ Saldo resetado para ${formatCurrency(d.balance)}`, "win");
      }
    } catch { showNotif(t("conn_error"), "error"); }
    finally { setResetting(false); setResetModalOpen(false); }
  }

  function addAsset(symbol: string) { if (!openAssets.includes(symbol)) setOpenAssets((p) => [...p, symbol]); }
  function removeAsset(symbol: string) { if (openAssets.length > 1) setOpenAssets((p) => p.filter((a) => a !== symbol)); }

  function togglePanel(panel: ActivePanel) { setActivePanel((p) => p === panel ? null : panel); }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#050509] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
            <span className="text-[#080c14] font-black text-sm">PB</span>
          </div>
          <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const balanceFmt = balance === null ? "…" : formatCurrency(balance);

  // ── Right panel (trade controls) ─────────────────────────────────────────
  const RightPanelContent = (
    <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
      <div className="p-3 space-y-3 shrink-0">

        {/* Asset card */}
        <div className="bg-white/3 border border-white/5 rounded-xl px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${assetInfo?.type === "forex" ? "bg-blue-400" : "bg-amber-400"}`} />
            <div>
              <div className="text-white text-xs font-bold">{selectedAsset}</div>
              <div className="text-white/30 text-[9px]">Até {DURATIONS.find((d) => d.value === selectedDuration)?.label}</div>
            </div>
          </div>
          <div className={`text-[10px] font-bold ${change24h >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
          </div>
        </div>

        {/* Sentiment bars */}
        <div className="space-y-1.5">
          {[
            { label: t("buy_pct"), pct: buySentiment,         color: "bg-emerald-500", textColor: "text-emerald-400" },
            { label: t("sell_pct"), pct: 100 - buySentiment,  color: "bg-rose-500",    textColor: "text-rose-400" },
          ].map(({ label, pct, color, textColor }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[9px] font-black uppercase ${textColor}`}>{label}</span>
                <span className={`text-[9px] font-bold ${textColor}`}>{pct}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Invest */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">{t("invest")}</span>
            {balance !== null && <span className="text-[9px] text-white/20 font-mono">{balanceFmt}</span>}
          </div>
          <div className="flex items-center bg-white/3 border border-white/8 rounded-xl overflow-hidden focus-within:border-amber-500/30 transition-colors">
            <button onClick={() => setAmount((a) => Math.max(1, a - 5))} className="w-9 h-10 text-white/30 hover:text-white hover:bg-white/5 transition-colors font-bold text-lg">−</button>
            <input type="number" value={amount} onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))} min={1}
              className="flex-1 bg-transparent text-center text-white text-sm font-mono focus:outline-none py-2 min-w-0" />
            <button onClick={() => setAmount((a) => a + 5)} className="w-9 h-10 text-white/30 hover:text-white hover:bg-white/5 transition-colors font-bold text-lg">+</button>
          </div>
          <div className="grid grid-cols-4 gap-1 mt-1.5">
            {[25, 50, 75].map((p) => (
              <button key={p} onClick={() => setAmount(Math.max(1, Math.floor((balance ?? 0) * (p / 100))))}
                disabled={balance === null || balance < 1}
                className="py-1.5 bg-white/3 border border-white/5 rounded-lg text-[9px] text-white/30 hover:text-white hover:border-white/10 transition-all disabled:opacity-20 font-semibold">{p}%
              </button>
            ))}
            <button onClick={() => setAmount(Math.max(1, Math.floor(balance ?? 0)))} disabled={balance === null || balance < 1}
              className="py-1.5 bg-amber-400/5 border border-amber-400/20 rounded-lg text-[9px] text-amber-500 hover:text-amber-400 hover:border-amber-400/40 transition-all disabled:opacity-20 font-bold">
              {t("max")}
            </button>
          </div>
          {amount > (balance ?? 0) && balance !== null && <p className="text-rose-400 text-[9px] mt-1">{t("insufficient")}</p>}
        </div>

        {/* Expiration */}
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-1.5">{t("expiry")}</div>
          <div className="grid grid-cols-5 gap-1">
            {DURATIONS.map((d, i) => (
              <button key={d.value} onClick={() => setSelectedDuration(d.value)} title={`Tecla ${i + 1}`}
                className={`py-1.5 rounded-lg text-[9px] font-bold transition-all ${
                  selectedDuration === d.value
                    ? "bg-amber-400/15 text-amber-400 border border-amber-400/30"
                    : "bg-white/3 text-white/30 border border-white/5 hover:border-white/10 hover:text-white/60"
                }`}>{d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Profit card */}
        <div className="bg-gradient-to-br from-white/3 to-white/1 border border-white/5 rounded-xl px-3 py-2.5">
          <div className="text-[9px] text-white/20 uppercase tracking-widest mb-1">{t("profit")}</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">+{(PAYOUT_RATE * 100).toFixed(0)}%</span>
            <span className="text-base text-emerald-500 font-mono font-bold">+{formatCurrency(potentialWin)}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
            <div className="text-center">
              <div className="text-[8px] text-emerald-700 mb-0.5">Ganhar</div>
              <div className="text-xs text-emerald-400 font-mono font-bold">+{formatCurrency(potentialWin)}</div>
            </div>
            <div className="text-white/10 text-lg">|</div>
            <div className="text-center">
              <div className="text-[8px] text-rose-700 mb-0.5">Perder</div>
              <div className="text-xs text-rose-400 font-mono font-bold">-{formatCurrency(amount)}</div>
            </div>
          </div>
        </div>

        {/* BUY / SELL */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => placeTrade("UP")} disabled={!canTrade}
            className="btn-up py-4 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-25 disabled:cursor-not-allowed text-white font-black flex flex-col items-center gap-0.5">
            <span className="text-xl leading-none">▲</span>
            <span className="text-sm tracking-wide">{t("buy")}</span>
            {currentPrice > 0 && <span className="text-[8px] opacity-60 font-normal font-mono">{formatPrice(askPrice, selectedAsset)}</span>}
          </button>
          <button onClick={() => placeTrade("DOWN")} disabled={!canTrade}
            className="btn-down py-4 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 disabled:opacity-25 disabled:cursor-not-allowed text-white font-black flex flex-col items-center gap-0.5">
            <span className="text-xl leading-none">▼</span>
            <span className="text-sm tracking-wide">{t("sell")}</span>
            {currentPrice > 0 && <span className="text-[8px] opacity-60 font-normal font-mono">{formatPrice(bidPrice, selectedAsset)}</span>}
          </button>
        </div>

        {placing && (
          <div className="flex items-center justify-center gap-2 text-[10px] text-amber-400/70">
            <div className="w-3 h-3 border border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
            {t("opening")}
          </div>
        )}
      </div>

      {/* Mini stats */}
      {stats.settled > 0 && (
        <div className="mt-auto border-t border-white/5 p-3 shrink-0">
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "Win%",   value: `${stats.winRate.toFixed(0)}%`, ok: stats.winRate >= 50 },
              { label: "P&L",    value: `${stats.pnl >= 0 ? "+" : ""}${formatCurrency(Math.abs(stats.pnl))}`, ok: stats.pnl >= 0 },
              { label: "Streak", value: stats.streak === 0 ? "—" : `${stats.streakType === "WIN" ? "🔥" : "❄️"}${stats.streak}`, ok: stats.streakType === "WIN" },
            ].map(({ label, value, ok }) => (
              <div key={label} className="bg-white/2 border border-white/5 rounded-xl p-2 text-center">
                <div className="text-[7px] text-white/20 uppercase tracking-wide mb-0.5">{label}</div>
                <div className={`text-[9px] font-bold ${ok ? "text-emerald-400" : "text-rose-400"}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-white/5 flex items-center gap-2 shrink-0">
        <button onClick={() => togglePanel("profile")} className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-70 transition-opacity">
          <Avatar name={session?.user?.name ?? "?"} image={userImage} size="sm" />
          <div className="min-w-0">
            <div className="text-[9px] text-white/50 truncate">{session?.user?.name}</div>
            <div className="text-[7px] text-emerald-500">● {t("demo")} ativo</div>
          </div>
        </button>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-[8px] text-white/20 hover:text-white/50 transition-colors">{t("logout")}</button>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-[#050509] overflow-hidden">

      {/* Toast */}
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${notification ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"}`}>
        {notification && (
          <div key={notification.key} className={`px-5 py-2.5 rounded-xl font-semibold text-sm shadow-2xl whitespace-nowrap border ${
            notification.type === "win" ? "bg-emerald-500 border-emerald-400 text-white" :
            notification.type === "loss" ? "bg-rose-600 border-rose-500 text-white" :
            "bg-amber-500 border-amber-400 text-[#080c14]"
          }`}>{notification.msg}</div>
        )}
      </div>

      {/* Modals */}
      <ConfirmModal open={resetModalOpen} title={t("reset_title")} message={t("reset_msg")}
        confirmLabel={resetting ? "…" : t("reset_btn")} danger
        onConfirm={handleReset} onCancel={() => setResetModalOpen(false)} />
      <DepositModal open={depositModalOpen} onClose={() => setDepositModalOpen(false)} />
      {showAssetPicker && (
        <AssetPicker assets={ALL_ASSETS} openAssets={openAssets} prices={prices}
          onAdd={addAsset} onRemove={removeAsset} onClose={() => setShowAssetPicker(false)} />
      )}

      {/* Hidden settlement */}
      <div className="sr-only" aria-hidden>
        <ActiveTrades trades={activeTrades} currentPrices={prices} onSettle={handleSettle} loading={false} />
      </div>

      {/* Deposit URL handler */}
      <Suspense fallback={null}>
        <DepositSuccessHandler
          onSuccess={() => { showNotif("💰 Depósito recebido!", "win"); fetchUser(); }}
          onVerified={() => { setEmailVerified(true); showNotif("✅ Email confirmado! Conta ativa.", "win"); }}
        />
      </Suspense>

      {/* ── HEADER ── */}
      <header className="h-16 bg-[#0a0c14] border-b border-white/5 flex items-center px-4 gap-3 shrink-0 z-10">
        <div className="flex items-center gap-2.5 shrink-0 pr-4 border-r border-white/5">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <span className="text-[#080c14] font-black text-xs">PB</span>
          </div>
          <span className="font-black text-base tracking-tight hidden sm:block">
            <span className="text-white">Prime</span><span className="text-amber-400"> Broker</span>
          </span>
        </div>

        {/* Asset tabs */}
        <div className="flex items-stretch overflow-x-auto scrollbar-hide flex-1 h-full">
          {openAssets.map((symbol) => {
            const p    = prices[symbol];
            const info = ALL_ASSETS.find((a) => a.symbol === symbol);
            const sel  = selectedAsset === symbol;
            return (
              <button key={symbol} onClick={() => setSelectedAsset(symbol)}
                className={`group flex flex-col items-start justify-center px-3 h-full border-b-2 transition-all shrink-0 ${sel ? "border-amber-400 bg-white/4" : "border-transparent hover:border-white/10 hover:bg-white/2"}`}>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${info?.type === "forex" ? "bg-blue-400" : "bg-amber-400"}`} />
                  <span className={`text-xs font-bold ${sel ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`}>{symbol}</span>
                  {openAssets.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); removeAsset(symbol); }}
                      className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-white/60 ml-0.5 text-xs">×</button>
                  )}
                </div>
                {p?.price ? (
                  <span className={`text-[9px] font-mono leading-none ${(p.change24h ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {p.change24h >= 0 ? "+" : ""}{p.change24h.toFixed(2)}%
                  </span>
                ) : <span className="text-[9px] text-white/10 animate-pulse">…</span>}
              </button>
            );
          })}
          <button onClick={() => setShowAssetPicker(true)}
            className="flex items-center justify-center w-10 h-full text-white/20 hover:text-amber-400 hover:bg-white/3 transition-all shrink-0 text-xl leading-none">+</button>
        </div>

        {/* Balance + Deposit */}
        <div className="flex items-center gap-2 shrink-0 pl-3 border-l border-white/5">
          <div className="hidden sm:flex items-center gap-2 bg-[#111827] border border-white/5 rounded-xl px-3 py-2 cursor-pointer hover:border-white/10 transition-all" onClick={() => setDepositModalOpen(true)}>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">{t("demo")}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className={`text-sm font-black font-mono ${balance === null ? "text-slate-700 animate-pulse" : "text-white"}`}>{balanceFmt}</span>
            </div>
          </div>
          <button onClick={() => setDepositModalOpen(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/25">
            <span>💰</span> {t("deposit")}
          </button>
        </div>
      </header>

      {/* ── BANNERS ── */}
      {emailVerified === false && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-amber-400 text-sm shrink-0">📧</span>
            <p className="text-xs text-amber-300/80 truncate">
              Confirme seu email para ativar todas as funcionalidades.
            </p>
          </div>
          <button
            onClick={async () => {
              const r = await fetch("/api/auth/resend-verify", { method: "POST" });
              if (r.ok) showNotif("📧 Email enviado!", "win");
            }}
            className="text-[10px] font-bold text-amber-400 border border-amber-400/30 rounded-lg px-2.5 py-1 hover:bg-amber-400/10 transition-colors shrink-0"
          >
            Reenviar
          </button>
        </div>
      )}
      {showDepositCta && emailVerified && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-emerald-400 text-sm shrink-0">💎</span>
            <p className="text-xs text-emerald-300/80 truncate">
              Você está no modo demo. Faça um depósito para ativar sua conta real.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setDepositModalOpen(true)}
              className="text-[10px] font-bold text-emerald-400 border border-emerald-400/30 rounded-lg px-2.5 py-1 hover:bg-emerald-400/10 transition-colors">
              Depositar
            </button>
            <button
              onClick={() => { setShowDepositCta(false); localStorage.setItem("pb-deposit-cta-dismissed", "1"); }}
              className="text-white/20 hover:text-white/50 text-xs">✕</button>
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Left sidebar (desktop only) */}
        <aside className="w-20 bg-[#0a0c14] border-r border-white/5 flex-col items-center py-1 gap-0 shrink-0 hidden md:flex">
          <NavItem icon={<IcoHistory />}  label={t("history")}   active={activePanel === "history"}    onClick={() => togglePanel("history")} />
          <NavItem icon={<IcoTrophy />}   label={t("ranking")}   active={activePanel === "ranking"}    onClick={() => togglePanel("ranking")} />
          <NavItem icon={<IcoStats />}    label={t("analysis")}  active={activePanel === "analysis"}   onClick={() => togglePanel("analysis")} />
          <NavItem icon={<IcoPromo />}    label={t("promo")}     active={activePanel === "promo"}      onClick={() => togglePanel("promo")} badge="1" />
          <NavItem icon={<IcoSupport />}  label={t("support")}   active={activePanel === "support"}    onClick={() => togglePanel("support")} />
          <NavItem icon={<IcoDeposit />}  label={t("deposit")}   onClick={() => setDepositModalOpen(true)} />
          <div className="mt-auto flex flex-col gap-0 w-full">
            <NavItem icon={<IcoCash />}   label={t("withdrawal")} active={activePanel === "withdrawal"} onClick={() => togglePanel("withdrawal")} />
            <NavItem icon={<IcoUser />}   label={t("profile")}    active={activePanel === "profile"}    onClick={() => togglePanel("profile")} />
            <NavItem icon={<IcoReset />}  label={t("reset")}      onClick={() => setResetModalOpen(true)} />
          </div>
        </aside>

        {/* Chart area + overlay panels */}
        <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${mobileTab !== "chart" && mobileTab !== "panels" ? "hidden md:flex" : "flex"}`}>

          {/* Chart top bar */}
          <div className="h-10 bg-[#0a0c14] border-b border-white/5 flex items-center px-4 gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${assetInfo?.type === "forex" ? "bg-blue-400" : "bg-amber-400"}`} />
              <span className="text-white text-sm font-bold">{selectedAsset}</span>
              <span className="text-white/30 text-[10px] hidden sm:block">{assetInfo?.name}</span>
              {change24h !== 0 && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded hidden sm:block ${change24h >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}`}>
                  {change24h >= 0 ? "▲" : "▼"} {Math.abs(change24h).toFixed(2)}%
                </span>
              )}
              {pricesStale && <span className="text-[9px] text-amber-600 bg-amber-600/10 rounded px-1.5 py-0.5 hidden sm:block">⚠ estimado</span>}
            </div>
            <div className={`text-base font-bold font-mono transition-colors duration-300 ${priceFlash === "up" ? "text-emerald-400" : priceFlash === "down" ? "text-rose-400" : "text-white"}`}>
              {currentPrice > 0 ? `$${formatPrice(currentPrice, selectedAsset)}` : <span className="text-white/10 animate-pulse">——</span>}
            </div>
            <div className="ml-auto flex items-center bg-white/3 border border-white/5 rounded-lg p-0.5 gap-0.5">
              {(["line", "candle"] as ChartType[]).map((tp) => (
                <button key={tp} onClick={() => setChartType(tp)}
                  className={`px-2.5 py-1 rounded-md text-[9px] font-semibold transition-all ${chartType === tp ? "bg-amber-400/15 text-amber-400" : "text-white/20 hover:text-white/50"}`}>
                  {tp === "line" ? "⟆ Linha" : "◈ Velas"}
                </button>
              ))}
            </div>
          </div>

          {/* Chart + overlays */}
          <div className="flex-1 min-h-0 relative">
            {/* Left overlay panel */}
            {activePanel && (
              <>
                {activePanel === "history"    && <HistoryPanel    trades={trades} loading={tradesLoading} onClose={() => setActivePanel(null)} />}
                {activePanel === "ranking"    && <RankingPanel    onClose={() => setActivePanel(null)} currentUserId={session?.user?.id} />}
                {activePanel === "analysis"   && <StatsPanel      trades={trades} onClose={() => setActivePanel(null)} onReset={() => { setActivePanel(null); setResetModalOpen(true); }} />}
                {activePanel === "promo"      && <PromoPanel      onClose={() => setActivePanel(null)} onDeposit={() => { setActivePanel(null); setDepositModalOpen(true); }} />}
                {activePanel === "support"    && <SupportPanel    onClose={() => setActivePanel(null)} />}
                {activePanel === "profile"    && <ProfilePanel    session={session} balance={balance} trades={trades} onClose={() => setActivePanel(null)} onPhotoUpdate={setUserImage} />}
                {activePanel === "withdrawal" && <WithdrawalPanel balance={balance} onClose={() => setActivePanel(null)} />}
              </>
            )}

            {/* Trade result overlay */}
            {tradeResult && (
              <TradeResultOverlay result={tradeResult} onDone={() => setTradeResult(null)} />
            )}

            {/* Chart — always mounted so it initialises behind the loading overlay */}
            <TradingChart
              key={selectedAsset + "-" + chartType}
              currentPrice={currentPrice}
              asset={selectedAsset}
              chartType={chartType}
              activeTrades={chartLoading ? [] : activeTradesForChart}
              onOhlcChange={setOhlc}
            />

            {/* Chart loading overlay (3 s) */}
            {chartLoading && <ChartLoadingOverlay asset={selectedAsset} />}

            {/* P&L badges */}
            {currentPrice > 0 && (
              <TradeAnnotations trades={activeTrades} prices={prices} asset={selectedAsset} />
            )}

            {/* BUY/SELL sentiment overlay */}
            {currentPrice > 0 && (
              <div className="absolute left-3 top-3 z-10 pointer-events-none">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 rounded-full bg-emerald-500" style={{ height: `${buySentiment * 0.6}px`, minHeight: "18px" }} />
                    <div><div className="text-emerald-400 text-[8px] font-black uppercase">{t("buy_pct")}</div><div className="text-emerald-400 text-[9px] font-bold">{buySentiment}%</div></div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 rounded-full bg-rose-500" style={{ height: `${(100 - buySentiment) * 0.6}px`, minHeight: "18px" }} />
                    <div><div className="text-rose-400 text-[8px] font-black uppercase">{t("sell_pct")}</div><div className="text-rose-400 text-[9px] font-bold">{100 - buySentiment}%</div></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* OHLC bar */}
          <div className="h-7 bg-[#050509] border-t border-white/3 flex items-center px-4 gap-3 shrink-0 overflow-x-auto scrollbar-hide">
            {ohlc ? (
              <>
                {[{ label: "O", value: ohlc.open }, { label: "H", value: ohlc.high }, { label: "L", value: ohlc.low }, { label: "C", value: ohlc.close }].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-1 shrink-0">
                    <span className="text-[9px] text-white/20">{label}</span>
                    <span className="text-[9px] text-white/50 font-mono">{formatPrice(value, selectedAsset)}</span>
                  </div>
                ))}
              </>
            ) : <span className="text-[9px] text-white/10">{t("hover_ohlc")}</span>}
            {currentPrice > 0 && (
              <div className="ml-auto flex items-center gap-3 shrink-0">
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

        {/* Right panel (desktop) */}
        <div className={`bg-[#0a0c14] border-l border-white/5 shrink-0 w-[220px] hidden md:flex flex-col`}>
          {RightPanelContent}
        </div>

        {/* Right panel (mobile trade tab) */}
        {mobileTab === "trade" && (
          <div className="flex-1 bg-[#0a0c14] flex flex-col md:hidden overflow-y-auto">
            {RightPanelContent}
          </div>
        )}
      </div>

      {/* Positions bar (desktop) */}
      <div className={`shrink-0 border-t border-white/5 transition-all duration-300 ${positionsOpen ? "h-[140px]" : "h-9"} hidden md:block bg-[#0a0c14]`}>
        <div className="h-9 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold text-white/30 uppercase tracking-widest">{t("open_pos")}</span>
            {activeTrades.length > 0 && (
              <span className="bg-amber-400/10 text-amber-400 text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">{activeTrades.length}</span>
            )}
          </div>
          <button onClick={() => setPositionsOpen((v) => !v)} className="text-white/20 hover:text-white/50 text-[9px]">
            {positionsOpen ? t("hide") : t("expand")}
          </button>
        </div>
        {positionsOpen && <div className="h-[101px]"><PositionsTable trades={activeTrades} currentPrices={prices} /></div>}
      </div>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav h-14 bg-[#0a0c14] border-t border-white/8 flex items-stretch md:hidden shrink-0">
        {[
          { id: "chart",  label: "Chart",   icon: "📈" },
          { id: "trade",  label: t("buy"),  icon: "🎯" },
          { id: "panels", label: "Menu",    icon: "☰"  },
        ].map(({ id, label, icon }) => (
          <button key={id} onClick={() => setMobileTab(id as "chart" | "trade" | "panels")}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[9px] font-bold uppercase transition-colors ${mobileTab === id ? "text-amber-400 bg-amber-400/5" : "text-slate-600 hover:text-white"}`}>
            <span className="text-base leading-none">{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {/* Mobile panels drawer */}
      {mobileTab === "panels" && (
        <div className="absolute inset-0 z-30 bg-[#050509] flex flex-col md:hidden overflow-y-auto pb-14">
          <div className="p-4 grid grid-cols-2 gap-2">
            {[
              { panel: "history" as ActivePanel,    label: t("history"),    icon: "🕐", color: "text-blue-400" },
              { panel: "ranking" as ActivePanel,    label: t("ranking"),    icon: "🏆", color: "text-amber-400" },
              { panel: "analysis" as ActivePanel,   label: t("analysis"),   icon: "📊", color: "text-purple-400" },
              { panel: "promo" as ActivePanel,      label: t("promo"),      icon: "⚡", color: "text-yellow-400" },
              { panel: "support" as ActivePanel,    label: t("support"),    icon: "💬", color: "text-cyan-400" },
              { panel: "profile" as ActivePanel,    label: t("profile"),    icon: "👤", color: "text-rose-400" },
              { panel: "withdrawal" as ActivePanel, label: t("withdrawal"), icon: "💸", color: "text-green-400" },
            ].map(({ panel, label, icon, color }) => (
              <button key={panel}
                onClick={() => { setActivePanel(panel); setMobileTab("chart"); }}
                className="flex flex-col items-center justify-center gap-2 py-5 bg-white/3 border border-white/8 rounded-2xl hover:border-white/15 transition-colors">
                <span className="text-3xl">{icon}</span>
                <span className={`text-xs font-bold ${color}`}>{label}</span>
              </button>
            ))}
            <button onClick={() => { setDepositModalOpen(true); setMobileTab("chart"); }}
              className="flex flex-col items-center justify-center gap-2 py-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              <span className="text-3xl">💰</span>
              <span className="text-xs font-bold text-emerald-400">{t("deposit")}</span>
            </button>
          </div>

          {/* Balance on mobile */}
          <div className="mx-4 p-4 bg-white/3 border border-white/8 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-[9px] text-white/30 uppercase tracking-wider">{t("balance_label")} {t("demo")}</div>
              <div className="text-2xl font-black text-white">{balanceFmt}</div>
            </div>
            <button onClick={() => setDepositModalOpen(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-sm transition-colors">
              {t("deposit")}
            </button>
          </div>
        </div>
      )}

      {/* Mobile overlay panel (open from panels menu) */}
      {mobileTab === "chart" && activePanel && (
        <div className="absolute inset-0 z-30 md:hidden">
          {activePanel === "history"    && <HistoryPanel    trades={trades} loading={tradesLoading} onClose={() => setActivePanel(null)} />}
          {activePanel === "ranking"    && <RankingPanel    onClose={() => setActivePanel(null)} currentUserId={session?.user?.id} />}
          {activePanel === "analysis"   && <StatsPanel      trades={trades} onClose={() => setActivePanel(null)} onReset={() => { setActivePanel(null); setResetModalOpen(true); }} />}
          {activePanel === "promo"      && <PromoPanel      onClose={() => setActivePanel(null)} onDeposit={() => { setActivePanel(null); setDepositModalOpen(true); }} />}
          {activePanel === "support"    && <SupportPanel    onClose={() => setActivePanel(null)} />}
          {activePanel === "profile"    && <ProfilePanel    session={session} balance={balance} trades={trades} onClose={() => setActivePanel(null)} onPhotoUpdate={setUserImage} />}
          {activePanel === "withdrawal" && <WithdrawalPanel balance={balance} onClose={() => setActivePanel(null)} />}
        </div>
      )}
    </div>
  );
}
