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
import { formatCurrency } from "@/lib/i18n";

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

interface OhlcData {
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Props {
  currentPrice: number;
  asset: string;
  chartType?: "candle" | "line";
  activeTrades?: TradeAnnotation[];
  onOhlcChange?: (ohlc: OhlcData | null) => void;
}

const MAX_LINE_POINTS = 600;
const BG = "#050509";

function generateCandles(basePrice: number): CandlestickData[] {
  const candles: CandlestickData[] = [];
  const currentMinute = Math.floor(Date.now() / 60000) * 60;
  let price = basePrice * 0.97;
  for (let i = 59; i >= 0; i--) {
    const time       = (currentMinute - i * 60) as Time;
    const volatility = basePrice * 0.003;
    const change     = (Math.random() - 0.5) * volatility * 2;
    const close      = price + change;
    const high       = Math.max(price, close) + Math.random() * volatility * 0.5;
    const low        = Math.min(price, close) - Math.random() * volatility * 0.5;
    candles.push({ time, open: price, high, low, close });
    price = close;
  }
  return candles;
}

function generateLine(basePrice: number): { time: Time; value: number }[] {
  const data: { time: Time; value: number }[] = [];
  const nowSec = Math.floor(Date.now() / 1000);
  let price = basePrice * 0.97;
  for (let i = 299; i >= 0; i--) {
    const time       = (nowSec - i * 2) as Time;
    const volatility = basePrice * 0.0006;
    price           += (Math.random() - 0.5) * volatility * 2;
    data.push({ time, value: price });
  }
  return data;
}

function CountdownCircle({ timeLeft, maxDuration, isWin }: { timeLeft: number; maxDuration: number; isWin: boolean }) {
  const progress = maxDuration > 0 ? Math.min(1, timeLeft / maxDuration) : 0;
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const color = isWin ? "#22c55e" : "#ef4444";
  return (
    <div className="relative w-8 h-8 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r={radius} fill="rgba(0,0,0,0.8)" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
        <circle
          cx="16" cy="16" r={radius}
          fill="none" stroke={color} strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <span className="relative text-[8px] font-black leading-none" style={{ color }}>
        {timeLeft >= 60 ? `${Math.ceil(timeLeft / 60)}m` : `${timeLeft}`}
      </span>
    </div>
  );
}

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
  const lastPriceRef  = useRef(currentPrice || 100);
  const simPriceRef   = useRef(currentPrice || 100);
  const modeRef       = useRef(chartType);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [annotations,  setAnnotations]  = useState<AnnotPos[]>([]);

  // ── Chart init + simulated 800ms movement ──────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    modeRef.current = chartType;
    const initPrice = lastPriceRef.current || 100;
    simPriceRef.current = initPrice;

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
      timeScale:       { borderColor: "#0d1020", timeVisible: true, secondsVisible: true },
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
      const candles = generateCandles(initPrice);
      candlesRef.current = candles;
      series.setData(candles);
    } else {
      series = chart.addSeries(AreaSeries, {
        lineColor:              "rgba(255,255,255,0.85)",
        topColor:               "rgba(255,255,255,0.06)",
        bottomColor:            "rgba(255,255,255,0)",
        lineWidth:              2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius:  3,
        crosshairMarkerBorderColor:      "rgba(255,255,255,0.5)",
        crosshairMarkerBackgroundColor:  "#ffffff",
      });
      const lineData = generateLine(initPrice);
      lineRef.current = lineData;
      series.setData(lineData);
    }

    chart.timeScale().fitContent();
    chartRef.current  = chart;
    seriesRef.current = series;

    // OHLC on crosshair move
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

    // Simulated 800ms micro-movement (keeps chart alive 24/7)
    const simInterval = setInterval(() => {
      if (!seriesRef.current) return;
      const base    = simPriceRef.current;
      const target  = lastPriceRef.current;
      // Drift toward real price + random noise
      const vol     = base * 0.0004;
      const drift   = (target - base) * 0.08;
      simPriceRef.current = base + drift + (Math.random() - 0.5) * vol * 2;
      const price = simPriceRef.current;

      if (modeRef.current === "candle") {
        if (!candlesRef.current.length) return;
        const last          = candlesRef.current[candlesRef.current.length - 1];
        const currentMinute = (Math.floor(Date.now() / 60000) * 60) as Time;
        if (last.time === currentMinute) {
          const updated: CandlestickData = {
            time:  currentMinute,
            open:  last.open,
            high:  Math.max(last.high, price),
            low:   Math.min(last.low,  price),
            close: price,
          };
          candlesRef.current[candlesRef.current.length - 1] = updated;
          seriesRef.current.update(updated);
        } else {
          const newCandle: CandlestickData = {
            time:  currentMinute,
            open:  last.close,
            high:  Math.max(last.close, price),
            low:   Math.min(last.close, price),
            close: price,
          };
          candlesRef.current.push(newCandle);
          seriesRef.current.update(newCandle);
        }
      } else {
        const nowSec  = Math.floor(Date.now() / 1000) as Time;
        const lastPt  = lineRef.current[lineRef.current.length - 1];
        if (lastPt && lastPt.time === nowSec) {
          // Update existing second instead of creating duplicate
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
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, chartType]);

  // Keep real price as target for simulated drift
  useEffect(() => {
    if (currentPrice > 0) lastPriceRef.current = currentPrice;
  }, [currentPrice]);

  // ── Annotation positions updated every 400ms ────────────────────────────────
  useEffect(() => {
    const update = () => {
      if (!chartRef.current || !seriesRef.current || !containerRef.current) return;
      const chart      = chartRef.current;
      const series     = seriesRef.current;
      const simPrice   = simPriceRef.current;
      const chartWidth = containerRef.current.clientWidth;

      const newAnnotations: AnnotPos[] = activeTrades.map((trade) => {
        const isWin = trade.direction === "UP"
          ? simPrice > trade.entryPrice
          : simPrice < trade.entryPrice;

        const pnl    = isWin ? trade.amount * PAYOUT_RATE : -trade.amount;
        const pnlPct = (pnl / trade.amount) * 100;

        const timeLeft   = Math.max(0, Math.ceil((new Date(trade.expiresAt).getTime() - Date.now()) / 1000));
        const maxDuration = Math.max(1, Math.round((new Date(trade.expiresAt).getTime() - new Date(trade.createdAt).getTime()) / 1000));

        // Entry price Y coordinate
        let entryY: number | null = null;
        try { entryY = series.priceToCoordinate(trade.entryPrice) ?? null; } catch {}

        // Expiry X coordinate — try timeToCoordinate first, then manual fallback
        let expiryX: number | null = null;
        const expiryTimeSec = Math.floor(new Date(trade.expiresAt).getTime() / 1000) as Time;
        try { expiryX = chart.timeScale().timeToCoordinate(expiryTimeSec) ?? null; } catch {}
        if (expiryX === null) {
          // Manual fallback using visible range
          try {
            const vr = chart.timeScale().getVisibleRange();
            if (vr) {
              const from   = Number(vr.from);
              const to     = Number(vr.to);
              const span   = to - from;
              if (span > 0) expiryX = ((Number(expiryTimeSec) - from) / span) * chartWidth;
            }
          } catch {}
        }

        // Clamp: only show if within chart bounds (allow a bit beyond right edge)
        if (expiryX !== null && (expiryX < 0 || expiryX > chartWidth + 40)) expiryX = null;

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
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  function toggleFullscreen() {
    const wrapper = containerRef.current?.parentElement;
    if (!wrapper) return;
    if (!document.fullscreenElement) wrapper.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  return (
    <div className="relative w-full h-full bg-[#050509]">
      <div ref={containerRef} className="w-full h-full" />

      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="text-white/[0.025] text-6xl font-black tracking-[0.3em] uppercase">
          Prime Broker
        </span>
      </div>

      {/* Avalon-style trade annotations */}
      {annotations.map((ann) => (
        <div key={ann.id} className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Horizontal entry price line */}
          {ann.entryY !== null && ann.entryY > 20 && (
            <>
              <div
                className="absolute left-0 right-14"
                style={{
                  top:        ann.entryY - 0.5,
                  height:     1,
                  backgroundImage: ann.isWin
                    ? "repeating-linear-gradient(to right,#22c55e 0,#22c55e 6px,transparent 6px,transparent 12px)"
                    : "repeating-linear-gradient(to right,#ef4444 0,#ef4444 6px,transparent 6px,transparent 12px)",
                  opacity: 0.85,
                }}
              />
              {/* P&L % label at entry price */}
              <div
                className="absolute right-16 flex items-center"
                style={{ top: ann.entryY - 9 }}
              >
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md backdrop-blur-sm ${
                  ann.isWin
                    ? "bg-emerald-500/25 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/25 text-rose-400 border border-rose-500/30"
                }`}>
                  {ann.isWin ? "+" : ""}{ann.pnlPct.toFixed(0)}%
                </span>
              </div>
            </>
          )}

          {/* Vertical expiry line + countdown circle */}
          {ann.expiryX !== null && (
            <>
              <div
                className="absolute top-0"
                style={{
                  left:   ann.expiryX - 0.5,
                  width:  1,
                  bottom: 28,
                  backgroundImage: ann.isWin
                    ? "repeating-linear-gradient(to bottom,#22c55e 0,#22c55e 5px,transparent 5px,transparent 10px)"
                    : "repeating-linear-gradient(to bottom,#ef4444 0,#ef4444 5px,transparent 5px,transparent 10px)",
                  opacity: 0.55,
                }}
              />
              <div
                className="absolute"
                style={{ left: ann.expiryX - 16, bottom: 30 }}
              >
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

      {/* Fullscreen toggle */}
      <button onClick={toggleFullscreen} title={isFullscreen ? "Sair" : "Fullscreen"}
        className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center bg-[#0c1018]/80 border border-white/5 rounded-lg text-white/20 hover:text-white/60 hover:border-white/10 transition-all backdrop-blur-sm"
      >
        {isFullscreen ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 15v4.5M9 15H4.5M15 9h4.5M15 9V4.5M15 15h4.5M15 15v4.5" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        )}
      </button>
    </div>
  );
}
