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

interface ActiveEntry {
  entryPrice: number;
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
  activeEntries?: ActiveEntry[];
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
    const time       = (nowSec - i * 5) as Time;
    const volatility = basePrice * 0.0008;
    price           += (Math.random() - 0.5) * volatility * 2;
    data.push({ time, value: price });
  }
  return data;
}

export default function TradingChart({
  currentPrice,
  asset,
  chartType = "line",
  activeEntries = [],
  onOhlcChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef    = useRef<ISeriesApi<any> | null>(null);
  const candlesRef   = useRef<CandlestickData[]>([]);
  const lineRef      = useRef<{ time: Time; value: number }[]>([]);
  const lastPriceRef = useRef(currentPrice);
  const modeRef      = useRef(chartType);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    modeRef.current = chartType;

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

    if (chartType === "candle") {
      const series = chart.addSeries(CandlestickSeries, {
        upColor:         "#26a69a",
        downColor:       "#ef5350",
        borderUpColor:   "#26a69a",
        borderDownColor: "#ef5350",
        wickUpColor:     "#26a69a",
        wickDownColor:   "#ef5350",
      });
      const candles = generateCandles(currentPrice);
      candlesRef.current = candles;
      series.setData(candles);
      seriesRef.current = series;

      for (const e of activeEntries) {
        series.createPriceLine({
          price: e.entryPrice, color: e.direction === "UP" ? "#26a69a" : "#ef5350",
          lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true,
          title: e.direction === "UP" ? "▲ entrada" : "▼ entrada",
        });
      }
    } else {
      const series = chart.addSeries(AreaSeries, {
        lineColor:              "rgba(255,255,255,0.85)",
        topColor:               "rgba(255,255,255,0.06)",
        bottomColor:            "rgba(255,255,255,0)",
        lineWidth:              2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius:  3,
        crosshairMarkerBorderColor: "rgba(255,255,255,0.5)",
        crosshairMarkerBackgroundColor: "#ffffff",
      });
      const lineData = generateLine(currentPrice);
      lineRef.current = lineData;
      series.setData(lineData);
      seriesRef.current = series;

      for (const e of activeEntries) {
        series.createPriceLine({
          price: e.entryPrice, color: e.direction === "UP" ? "#26a69a" : "#ef5350",
          lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true,
          title: e.direction === "UP" ? "▲" : "▼",
        });
      }
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

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

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, chartType]);

  // Price tick
  useEffect(() => {
    if (!seriesRef.current || currentPrice === 0) return;
    if (modeRef.current === "candle") {
      if (!candlesRef.current.length) return;
      const last          = candlesRef.current[candlesRef.current.length - 1];
      const currentMinute = (Math.floor(Date.now() / 60000) * 60) as Time;
      if (last.time === currentMinute) {
        const updated: CandlestickData = {
          time: currentMinute, open: last.open,
          high: Math.max(last.high, currentPrice),
          low:  Math.min(last.low,  currentPrice),
          close: currentPrice,
        };
        candlesRef.current[candlesRef.current.length - 1] = updated;
        seriesRef.current.update(updated);
      } else {
        const newCandle: CandlestickData = {
          time: currentMinute, open: lastPriceRef.current,
          high: Math.max(lastPriceRef.current, currentPrice),
          low:  Math.min(lastPriceRef.current, currentPrice),
          close: currentPrice,
        };
        candlesRef.current.push(newCandle);
        seriesRef.current.update(newCandle);
      }
    } else {
      const nowSec = Math.floor(Date.now() / 1000) as Time;
      if (lineRef.current.length >= MAX_LINE_POINTS)
        lineRef.current = lineRef.current.slice(-MAX_LINE_POINTS + 1);
      const point = { time: nowSec, value: currentPrice };
      lineRef.current.push(point);
      seriesRef.current.update(point);
    }
    lastPriceRef.current = currentPrice;
  }, [currentPrice]);

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

      {/* Fullscreen */}
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
