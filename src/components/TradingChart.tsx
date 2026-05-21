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

interface Props {
  currentPrice: number;
  asset: string;
  chartType?: "candle" | "line";
  activeEntries?: ActiveEntry[];
}

const MAX_LINE_POINTS = 600;

function generateCandles(basePrice: number): CandlestickData[] {
  const candles: CandlestickData[] = [];
  const currentMinute = Math.floor(Date.now() / 60000) * 60;
  let price = basePrice * 0.97;
  for (let i = 59; i >= 0; i--) {
    const time = (currentMinute - i * 60) as Time;
    const volatility = basePrice * 0.003;
    const change = (Math.random() - 0.5) * volatility * 2;
    const close = price + change;
    const high = Math.max(price, close) + Math.random() * volatility * 0.5;
    const low  = Math.min(price, close) - Math.random() * volatility * 0.5;
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
    const time = (nowSec - i * 5) as Time;
    const volatility = basePrice * 0.0008;
    price += (Math.random() - 0.5) * volatility * 2;
    data.push({ time, value: price });
  }
  return data;
}

export default function TradingChart({ currentPrice, asset, chartType = "candle", activeEntries = [] }: Props) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const chartRef       = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef      = useRef<ISeriesApi<any> | null>(null);
  const candlesRef     = useRef<CandlestickData[]>([]);
  const lineRef        = useRef<{ time: Time; value: number }[]>([]);
  const lastPriceRef   = useRef(currentPrice);
  const modeRef        = useRef(chartType);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Rebuild chart when asset or chartType changes
  useEffect(() => {
    if (!containerRef.current) return;
    modeRef.current = chartType;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#080c14" },
        textColor: "#3d4f6b",
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#0d1424" },
        horzLines: { color: "#0d1424" },
      },
      crosshair: {
        vertLine: { color: "#2d4070", width: 1, style: 2 },
        horzLine: { color: "#2d4070", width: 1, style: 2 },
      },
      rightPriceScale: { borderColor: "#0d1424", textColor: "#3d4f6b" },
      timeScale:       { borderColor: "#0d1424", timeVisible: true, secondsVisible: false },
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    if (chartType === "candle") {
      const series = chart.addSeries(CandlestickSeries, {
        upColor:         "#10b981",
        downColor:       "#f43f5e",
        borderUpColor:   "#10b981",
        borderDownColor: "#f43f5e",
        wickUpColor:     "#10b981",
        wickDownColor:   "#f43f5e",
      });
      const candles = generateCandles(currentPrice);
      candlesRef.current = candles;
      series.setData(candles);
      seriesRef.current = series;

      // Draw entry price lines for active trades
      for (const entry of activeEntries) {
        series.createPriceLine({
          price:            entry.entryPrice,
          color:            entry.direction === "UP" ? "#10b981" : "#f43f5e",
          lineWidth:        1,
          lineStyle:        LineStyle.Dashed,
          axisLabelVisible: true,
          title:            entry.direction === "UP" ? "▲ entrada" : "▼ entrada",
        });
      }
    } else {
      const series = chart.addSeries(AreaSeries, {
        lineColor:              "#10b981",
        topColor:               "rgba(16, 185, 129, 0.12)",
        bottomColor:            "rgba(16, 185, 129, 0)",
        lineWidth:              2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius:  4,
      });
      const lineData = generateLine(currentPrice);
      lineRef.current = lineData;
      series.setData(lineData);
      seriesRef.current = series;

      for (const entry of activeEntries) {
        series.createPriceLine({
          price:            entry.entryPrice,
          color:            entry.direction === "UP" ? "#10b981" : "#f43f5e",
          lineWidth:        1,
          lineStyle:        LineStyle.Dashed,
          axisLabelVisible: true,
          title:            entry.direction === "UP" ? "▲ entrada" : "▼ entrada",
        });
      }
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

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

  // Redraw entry lines when active trades change
  useEffect(() => {
    if (!seriesRef.current || activeEntries.length === 0) return;
    // Lines are recreated on full chart rebuild; only rebuild if entries change is significant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntries.length]);

  // Price tick update
  useEffect(() => {
    if (!seriesRef.current || currentPrice === 0) return;

    if (modeRef.current === "candle") {
      if (candlesRef.current.length === 0) return;
      const last = candlesRef.current[candlesRef.current.length - 1];
      const currentMinute = (Math.floor(Date.now() / 60000) * 60) as Time;
      if (last.time === currentMinute) {
        const updated: CandlestickData = {
          time:  currentMinute,
          open:  last.open,
          high:  Math.max(last.high, currentPrice),
          low:   Math.min(last.low, currentPrice),
          close: currentPrice,
        };
        candlesRef.current[candlesRef.current.length - 1] = updated;
        seriesRef.current.update(updated);
      } else {
        const newCandle: CandlestickData = {
          time:  currentMinute,
          open:  lastPriceRef.current,
          high:  Math.max(lastPriceRef.current, currentPrice),
          low:   Math.min(lastPriceRef.current, currentPrice),
          close: currentPrice,
        };
        candlesRef.current.push(newCandle);
        seriesRef.current.update(newCandle);
      }
    } else {
      const nowSec = Math.floor(Date.now() / 1000) as Time;
      const point = { time: nowSec, value: currentPrice };
      // Cap memory: keep last MAX_LINE_POINTS
      if (lineRef.current.length >= MAX_LINE_POINTS) {
        lineRef.current = lineRef.current.slice(-MAX_LINE_POINTS + 1);
      }
      lineRef.current.push(point);
      seriesRef.current.update(point);
    }

    lastPriceRef.current = currentPrice;
  }, [currentPrice]);

  // Fullscreen listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  function toggleFullscreen() {
    if (!containerRef.current) return;
    const wrapper = containerRef.current.parentElement;
    if (!wrapper) return;
    if (!document.fullscreenElement) {
      wrapper.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? "Sair do fullscreen" : "Fullscreen"}
        className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center bg-[#0c1018]/80 border border-[#1e2a42] rounded-lg text-slate-500 hover:text-white hover:border-[#2d4070] transition-all backdrop-blur-sm"
      >
        {isFullscreen ? (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        )}
      </button>
    </div>
  );
}
