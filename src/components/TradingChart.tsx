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
  let price = basePrice * 0.97;

  for (let i = 59; i >= 0; i--) {
    const time = (now - i * 60) as Time;
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
        background: { type: ColorType.Solid, color: "#0e1117" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      crosshair: {
        vertLine: { color: "#4b5563" },
        horzLine: { color: "#4b5563" },
      },
      rightPriceScale: { borderColor: "#1f2937" },
      timeScale: {
        borderColor: "#1f2937",
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const candles = generateInitialCandles(currentPrice);
    candlesRef.current = candles;
    series.setData(candles);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
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
