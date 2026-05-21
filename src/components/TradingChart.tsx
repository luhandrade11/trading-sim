"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  CandlestickSeries,
  Time,
  ColorType,
} from "lightweight-charts";

interface Props {
  currentPrice: number;
  asset: string;
}

function generateInitialCandles(basePrice: number): CandlestickData[] {
  const candles: CandlestickData[] = [];
  const now = Math.floor(Date.now() / 1000);
  const currentMinute = Math.floor(now / 60) * 60;
  let price = basePrice * 0.97;

  for (let i = 59; i >= 0; i--) {
    const time = (currentMinute - i * 60) as Time;
    const open = price;
    const volatility = basePrice * 0.003;
    const change = (Math.random() - 0.5) * volatility * 2;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    candles.push({ time, open, high, low, close });
    price = close;
  }

  return candles;
}

export default function TradingChart({ currentPrice, asset }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const candlesRef = useRef<CandlestickData[]>([]);
  const lastPriceRef = useRef(currentPrice);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#080c14" },
        textColor: "#475569",
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#0f1829" },
        horzLines: { color: "#0f1829" },
      },
      crosshair: {
        vertLine: { color: "#2d4070", width: 1, style: 2 },
        horzLine: { color: "#2d4070", width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: "#0f1829",
        textColor: "#475569",
      },
      timeScale: {
        borderColor: "#0f1829",
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderUpColor: "#10b981",
      borderDownColor: "#f43f5e",
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const candles = generateInitialCandles(currentPrice);
    candlesRef.current = candles;
    series.setData(candles);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset]);

  useEffect(() => {
    if (!seriesRef.current || candlesRef.current.length === 0) return;
    if (currentPrice === 0) return;

    const candles = candlesRef.current;
    const last = candles[candles.length - 1];
    const nowSec = Math.floor(Date.now() / 1000);
    const currentMinute = (Math.floor(nowSec / 60) * 60) as Time;

    if (last.time === currentMinute) {
      const updated: CandlestickData = {
        time: currentMinute,
        open: last.open,
        high: Math.max(last.high, currentPrice),
        low: Math.min(last.low, currentPrice),
        close: currentPrice,
      };
      candles[candles.length - 1] = updated;
      seriesRef.current.update(updated);
    } else {
      const newCandle: CandlestickData = {
        time: currentMinute,
        open: lastPriceRef.current,
        high: Math.max(lastPriceRef.current, currentPrice),
        low: Math.min(lastPriceRef.current, currentPrice),
        close: currentPrice,
      };
      candles.push(newCandle);
      seriesRef.current.update(newCandle);
    }

    lastPriceRef.current = currentPrice;
  }, [currentPrice]);

  return <div ref={containerRef} className="w-full h-full" />;
}
