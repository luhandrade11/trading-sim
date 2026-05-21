"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  CandlestickSeries,
  AreaSeries,
  LineStyle,
  Time,
  ColorType,
} from "lightweight-charts";
import { PAYOUT_RATE } from "@/lib/constants";

// ── Seeded PRNG (Mulberry32) ─────────────────────────────────────────────────
// Same asset + same 2-hour block → identical chart history every time

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h >>> 0;
}

function getChartSeed(asset: string): number {
  const block = Math.floor(Date.now() / (2 * 3_600_000));
  return hashStr(asset + "-" + block);
}

// ── Chart data — generated BACKWARDS from current price ──────────────────────
// This guarantees: last data point === current price → no jump when sim starts

function generateLine(endPrice: number, asset: string): { time: Time; value: number }[] {
  const rand  = mulberry32(getChartSeed(asset));
  const now   = Math.floor(Date.now() / 1000);
  const pts: number[] = [];
  let p = endPrice;

  for (let i = 0; i < 300; i++) {
    pts.unshift(p);
    const vol = endPrice * 0.0004;
    const mr  = (endPrice - p) * 0.018; // gentle mean reversion toward endPrice
    p = p - (rand() - 0.5) * vol * 2 - mr;
    p = Math.max(p, endPrice * 0.001);
  }

  return pts.map((v, i) => ({
    time:  (now - (299 - i) * 2) as Time,
    value: v,
  }));
}

function generateCandles(endPrice: number, asset: string): CandlestickData[] {
  const rand  = mulberry32(getChartSeed(asset));
  const now   = Math.floor(Date.now() / 60000) * 60;
  const closes: number[] = [];
  let p = endPrice;

  for (let i = 0; i < 60; i++) {
    closes.unshift(p);
    const vol = endPrice * 0.0025;
    const mr  = (endPrice - p) * 0.05;
    p = p - (rand() - 0.5) * vol * 2 - mr;
    p = Math.max(p, endPrice * 0.001);
  }

  return closes.map((close, i) => {
    const open = i > 0 ? closes[i - 1] : close;
    const vol  = endPrice * 0.002;
    const high = Math.max(open, close) + rand() * vol;
    const low  = Math.min(open, close) - rand() * vol;
    return {
      time:  (now - (59 - i) * 60) as Time,
      open,
      high,
      low:   Math.max(low, endPrice * 0.001),
      close,
    };
  });
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface TradeAnnotation {
  id: string;
  entryPrice: number;
  direction: "UP" | "DOWN";
  expiresAt: string;
  createdAt: string;
  amount: number;
}

interface AnnotPos {
  id: string;
  entryY: number | null;
  expiryX: number | null;
  timeLeft: number;
  maxDuration: number;
  isWin: boolean;
  pnlPct: number;
  direction: "UP" | "DOWN";
}

interface OhlcData { open: number; high: number; low: number; close: number; }

interface Props {
  currentPrice: number;
  asset: string;
  chartType?: "candle" | "line";
  activeTrades?: TradeAnnotation[];
  onOhlcChange?: (ohlc: OhlcData | null) => void;
}

// ── Countdown circle ─────────────────────────────────────────────────────────

function CountdownCircle({ timeLeft, maxDuration, isWin }: {
  timeLeft: number; maxDuration: number; isWin: boolean;
}) {
  const pct   = maxDuration > 0 ? Math.min(1, timeLeft / maxDuration) : 0;
  const r     = 13;
  const circ  = 2 * Math.PI * r;
  const color = isWin ? "#22c55e" : "#ef4444";
  return (
    <div className="relative w-8 h-8 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r={r} fill="rgba(0,0,0,0.85)"
          stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
        <circle cx="16" cy="16" r={r} fill="none" stroke={color}
          strokeWidth="2" strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" />
      </svg>
      <span className="relative text-[8px] font-black leading-none" style={{ color }}>
        {timeLeft >= 60 ? `${Math.ceil(timeLeft / 60)}m` : `${timeLeft}`}
      </span>
    </div>
  );
}

// How many seconds of future whitespace to show initially
const FUTURE_BUFFER_SECS = 90;
// How many seconds of history to show
const HISTORY_SECS = 300;
const MAX_LINE_POINTS = 600;
const BG = "#050509";

// ── Main component ────────────────────────────────────────────────────────────

export default function TradingChart({
  currentPrice,
  asset,
  chartType = "line",
  activeTrades = [],
  onOhlcChange,
}: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const chartRef      = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef     = useRef<ISeriesApi<any> | null>(null);
  const candlesRef    = useRef<CandlestickData[]>([]);
  const lineRef       = useRef<{ time: Time; value: number }[]>([]);
  const lastPriceRef  = useRef<number>(currentPrice || 100);
  const simPriceRef   = useRef<number>(currentPrice || 100);
  const modeRef       = useRef(chartType);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [annotations,  setAnnotations]  = useState<AnnotPos[]>([]);

  // ── Chart init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    modeRef.current = chartType;
    setAnnotations([]);

    const initPrice = currentPrice > 0 ? currentPrice : Math.max(lastPriceRef.current, 1);
    lastPriceRef.current = initPrice;
    simPriceRef.current  = initPrice; // sim starts from chart's last point (= initPrice)

    const chart = createChart(containerRef.current, {
      layout: {
        background:  { type: ColorType.Solid, color: BG },
        textColor:   "#4a5568",
        fontFamily:  "var(--font-geist-mono), monospace",
        fontSize:    10,
      },
      grid: {
        vertLines: { color: "#0d1020" },
        horzLines: { color: "#0d1020" },
      },
      crosshair: {
        vertLine: { color: "#2d3748", width: 1, style: LineStyle.Dashed },
        horzLine: { color: "#2d3748", width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: { borderColor: "#0d1020", textColor: "#4a5568" },
      timeScale: {
        borderColor:    "#0d1020",
        timeVisible:    true,
        secondsVisible: true,
      },
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let series: ISeriesApi<any>;
    if (chartType === "candle") {
      series = chart.addSeries(CandlestickSeries, {
        upColor:         "#26a69a",
        downColor:       "#ef5350",
        borderUpColor:   "#26a69a",
        borderDownColor: "#ef5350",
        wickUpColor:     "#26a69a",
        wickDownColor:   "#ef5350",
      });
      const candles = generateCandles(initPrice, asset);
      candlesRef.current = candles;
      series.setData(candles);
    } else {
      series = chart.addSeries(AreaSeries, {
        lineColor:    "rgba(255,255,255,0.85)",
        topColor:     "rgba(255,255,255,0.06)",
        bottomColor:  "rgba(255,255,255,0)",
        lineWidth:    2,
        crosshairMarkerVisible:         true,
        crosshairMarkerRadius:          3,
        crosshairMarkerBorderColor:     "rgba(255,255,255,0.5)",
        crosshairMarkerBackgroundColor: "#ffffff",
      });
      const lineData = generateLine(initPrice, asset);
      lineRef.current = lineData;
      series.setData(lineData);
    }

    chartRef.current  = chart;
    seriesRef.current = series;

    // Explicitly set visible range: HISTORY_SECS of history + FUTURE_BUFFER_SECS of future
    // This is what makes timeToCoordinate work for near-future expiry times
    const nowSec = Math.floor(Date.now() / 1000);
    chart.timeScale().setVisibleRange({
      from: (nowSec - HISTORY_SECS)       as Time,
      to:   (nowSec + FUTURE_BUFFER_SECS) as Time,
    });

    // OHLC crosshair
    chart.subscribeCrosshairMove((param) => {
      if (!onOhlcChange) return;
      if (!param.seriesData.size || !seriesRef.current) { onOhlcChange(null); return; }
      const d = param.seriesData.get(seriesRef.current);
      if (!d) { onOhlcChange(null); return; }
      if ("open" in d) {
        onOhlcChange({ open: d.open as number, high: d.high as number, low: d.low as number, close: d.close as number });
      } else if ("value" in d) {
        const v = d.value as number;
        onOhlcChange({ open: v, high: v, low: v, close: v });
      }
    });

    // 800ms simulated movement — continuous movement 24/7
    const simInterval = setInterval(() => {
      if (!seriesRef.current) return;
      const base   = simPriceRef.current;
      const target = lastPriceRef.current;
      const vol    = base * 0.00035;
      const drift  = (target - base) * 0.06;
      simPriceRef.current = Math.max(base + drift + (Math.random() - 0.5) * vol * 2, base * 0.001);
      const price = simPriceRef.current;

      if (modeRef.current === "candle") {
        if (!candlesRef.current.length) return;
        const last   = candlesRef.current[candlesRef.current.length - 1];
        const curMin = (Math.floor(Date.now() / 60000) * 60) as Time;
        if (last.time === curMin) {
          const updated: CandlestickData = {
            time: curMin, open: last.open,
            high: Math.max(last.high, price),
            low:  Math.min(last.low,  price),
            close: price,
          };
          candlesRef.current[candlesRef.current.length - 1] = updated;
          seriesRef.current.update(updated);
        } else {
          const newC: CandlestickData = {
            time: curMin, open: last.close,
            high: Math.max(last.close, price),
            low:  Math.min(last.close, price),
            close: price,
          };
          candlesRef.current.push(newC);
          seriesRef.current.update(newC);
        }
      } else {
        const nowSec = Math.floor(Date.now() / 1000) as Time;
        const last   = lineRef.current[lineRef.current.length - 1];
        if (last && last.time === nowSec) {
          lineRef.current[lineRef.current.length - 1] = { time: nowSec, value: price };
          seriesRef.current.update({ time: nowSec, value: price });
        } else {
          if (lineRef.current.length >= MAX_LINE_POINTS)
            lineRef.current = lineRef.current.slice(-MAX_LINE_POINTS + 1);
          lineRef.current.push({ time: nowSec, value: price });
          seriesRef.current.update({ time: nowSec, value: price });
        }
      }
    }, 800);

    // Scroll time scale forward as time passes (keeps "now" in view)
    const scrollInterval = setInterval(() => {
      if (!chartRef.current) return;
      const nowSec = Math.floor(Date.now() / 1000);
      const vr = chartRef.current.timeScale().getVisibleRange();
      if (!vr) return;
      const span = Number(vr.to) - Number(vr.from);
      // Shift the window forward to keep current time centered-right
      chartRef.current.timeScale().setVisibleRange({
        from: (nowSec - HISTORY_SECS)       as Time,
        to:   (nowSec + FUTURE_BUFFER_SECS) as Time,
      });
      // Restore if trades need more future space (handled in activeTrades effect)
      void span;
    }, 10_000); // gentle shift every 10s

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      clearInterval(simInterval);
      clearInterval(scrollInterval);
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current  = null;
      seriesRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, chartType]);

  // Update real price target
  useEffect(() => {
    if (currentPrice > 0) lastPriceRef.current = currentPrice;
  }, [currentPrice]);

  // ── Extend visible range when trades are placed ───────────────────────────
  useEffect(() => {
    if (!chartRef.current || activeTrades.length === 0) return;
    const nowSec    = Math.floor(Date.now() / 1000);
    const maxExpiry = Math.max(...activeTrades.map((t) =>
      Math.floor(new Date(t.expiresAt).getTime() / 1000)
    ));
    if (maxExpiry <= nowSec) return;

    // Need future buffer = time until last expiry + 30s padding
    const futureSecs = (maxExpiry - nowSec) + 30;
    const vr = chartRef.current.timeScale().getVisibleRange();
    if (!vr) return;

    const desiredTo = (nowSec + futureSecs) as Time;
    if (futureSecs > FUTURE_BUFFER_SECS || Number(vr.to) < nowSec + futureSecs) {
      chartRef.current.timeScale().setVisibleRange({
        from: (nowSec - HISTORY_SECS) as Time,
        to:   desiredTo,
      });
    }
  }, [activeTrades]);

  // ── Annotation positions ──────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      if (!chartRef.current || !seriesRef.current || !containerRef.current) return;
      const chart      = chartRef.current;
      const series     = seriesRef.current;
      const simPrice   = simPriceRef.current;
      const chartWidth = containerRef.current.clientWidth;
      const vr         = chart.timeScale().getVisibleRange();

      const newAnnotations: AnnotPos[] = activeTrades.map((trade) => {
        // Use tiny tolerance (0.005%) so equal/near-equal prices show as winning
        // rather than always-red at bet placement moment
        const epsilon = trade.entryPrice * 0.00005;
        const isWin = trade.direction === "UP"
          ? simPrice >= trade.entryPrice - epsilon
          : simPrice <= trade.entryPrice + epsilon;
        const pnl    = isWin ? trade.amount * PAYOUT_RATE : -trade.amount;
        const pnlPct = (pnl / trade.amount) * 100;
        const timeLeft    = Math.max(0, Math.ceil((new Date(trade.expiresAt).getTime() - Date.now()) / 1000));
        const maxDuration = Math.max(1, Math.round(
          (new Date(trade.expiresAt).getTime() - new Date(trade.createdAt).getTime()) / 1000
        ));

        // Y: entry price horizontal line
        let entryY: number | null = null;
        try { entryY = series.priceToCoordinate(trade.entryPrice) ?? null; } catch {}

        // X: expiry vertical line — manual calculation using visible range
        let expiryX: number | null = null;
        if (vr && chartWidth > 0) {
          const fromSec  = Number(vr.from);
          const toSec    = Number(vr.to);
          const span     = toSec - fromSec;
          if (span > 0) {
            const expSec = new Date(trade.expiresAt).getTime() / 1000;
            const rawX   = ((expSec - fromSec) / span) * chartWidth;
            // Only show if within the chart's drawable area
            if (rawX > 5 && rawX < chartWidth - 2) expiryX = rawX;
          }
        }

        return { id: trade.id, entryY, expiryX, timeLeft, maxDuration, isWin, pnlPct, direction: trade.direction };
      });

      setAnnotations(newAnnotations);
    };

    update();
    const id = setInterval(update, 400);
    return () => clearInterval(id);
  }, [activeTrades]);

  // Fullscreen
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  function toggleFullscreen() {
    const w = containerRef.current?.parentElement;
    if (!w) return;
    if (!document.fullscreenElement) w.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  return (
    <div className="relative w-full h-full bg-[#050509]">
      {/* isolation:isolate creates a stacking context that contains lightweight-charts'
          internal z-indices, so our sibling overlay divs appear on top of the canvas */}
      <div ref={containerRef} className="w-full h-full" style={{ isolation: "isolate" }} />

      {/* Watermark — z-index:1 ensures it paints above the chart canvas stacking context */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        style={{ zIndex: 1 }}>
        <span
          className="font-black uppercase tracking-[0.35em] text-[clamp(1.5rem,5vw,3.5rem)]"
          style={{
            color:            "transparent",
            WebkitTextStroke: "1px rgba(255,255,255,0.07)",
            textShadow:       "0 0 80px rgba(251,191,36,0.06)",
          }}
        >
          Prime Broker
        </span>
      </div>

      {/* Avalon annotations — z-index:2 keeps them above watermark and canvas */}
      {annotations.map((ann) => (
        <div key={ann.id} className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 2 }}>

          {/* Horizontal dashed entry price line */}
          {ann.entryY !== null && ann.entryY > 20 && (
            <>
              <div style={{
                position:        "absolute",
                left:            0,
                right:           56,
                top:             ann.entryY - 0.5,
                height:          1,
                backgroundImage: ann.isWin
                  ? "repeating-linear-gradient(to right,#22c55e 0,#22c55e 6px,transparent 6px,transparent 12px)"
                  : "repeating-linear-gradient(to right,#ef4444 0,#ef4444 6px,transparent 6px,transparent 12px)",
                opacity: 0.9,
              }} />
              {/* P&L % label */}
              <div style={{ position: "absolute", right: 60, top: ann.entryY - 10 }}
                className="flex items-center">
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                  ann.isWin
                    ? "bg-emerald-500/25 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/25 text-rose-400 border border-rose-500/30"
                }`}>
                  {ann.isWin ? "+" : ""}{ann.pnlPct.toFixed(0)}%
                </span>
              </div>
            </>
          )}

          {/* Vertical dashed expiry line + countdown circle */}
          {ann.expiryX !== null && (
            <>
              <div style={{
                position:        "absolute",
                left:            ann.expiryX - 0.5,
                top:             0,
                bottom:          30,
                width:           1,
                backgroundImage: ann.isWin
                  ? "repeating-linear-gradient(to bottom,#22c55e 0,#22c55e 5px,transparent 5px,transparent 10px)"
                  : "repeating-linear-gradient(to bottom,#ef4444 0,#ef4444 5px,transparent 5px,transparent 10px)",
                opacity: 0.65,
              }} />
              <div style={{ position: "absolute", left: ann.expiryX - 16, bottom: 32 }}>
                <CountdownCircle
                  timeLeft={ann.timeLeft}
                  maxDuration={ann.maxDuration}
                  isWin={ann.isWin}
                />
              </div>
            </>
          )}
        </div>
      ))}

      {/* Fullscreen button */}
      <button onClick={toggleFullscreen} title={isFullscreen ? "Sair" : "Fullscreen"}
        className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center bg-[#0c1018]/80 border border-white/5 rounded-lg text-white/20 hover:text-white/60 hover:border-white/10 transition-all backdrop-blur-sm">
        {isFullscreen ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 9V4.5M9 9H4.5M9 15v4.5M9 15H4.5M15 9h4.5M15 9V4.5M15 15h4.5M15 15v4.5" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        )}
      </button>
    </div>
  );
}
