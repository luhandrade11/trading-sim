"use client";

import { useEffect, useRef } from "react";

// ── Seeded PRNG (Mulberry32) ───────────────────────────────────────────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function assetSeed(asset: string): number {
  return asset.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 2654435761;
}

// ── Per-asset volatility & decimals ───────────────────────────────────────────
const VOL: Record<string, number> = {
  "BTC/USD": 0.0018,
  "ETH/USD": 0.0022,
  "EUR/USD": 0.00014,
  "GBP/USD": 0.00017,
  "SOL/USD": 0.0028,
};

const DEC: Record<string, number> = {
  "BTC/USD": 2,
  "ETH/USD": 2,
  "EUR/USD": 5,
  "GBP/USD": 5,
  "SOL/USD": 3,
};

const TICK_MS = 700;
const HIST    = 280;
const MAX_BUF = 500;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TradeAnnotation {
  id:         string;
  entryPrice: number;
  direction:  "UP" | "DOWN";
  expiresAt:  string;
  createdAt:  string;
  amount:     number;
}

interface OhlcData { open: number; high: number; low: number; close: number }

interface Props {
  asset:              string;
  initialPrice:       number;
  trades:             TradeAnnotation[];
  simEntryOverrides?: Map<string, number>;
  onPriceUpdate?:     (p: number) => void;
  onSettleTrade?:     (id: string, won: boolean) => void;
  onWinStatesChange?: (states: Record<string, boolean>) => void;
  onOhlcChange?:      (ohlc: OhlcData | null) => void;
}

interface Tick { t: number; p: number }

// ── Component ──────────────────────────────────────────────────────────────────

export default function CustomChart({
  asset,
  initialPrice,
  trades,
  simEntryOverrides,
  onPriceUpdate,
  onSettleTrade,
  onWinStatesChange,
  onOhlcChange,
}: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const bufRef      = useRef<Tick[]>([]);
  const curRef      = useRef(0);
  const settledRef  = useRef<Set<string>>(new Set());
  const entryMapRef = useRef<Map<string, number>>(new Map());
  const rafRef      = useRef(0);
  const timerRef    = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Always-current prop refs — avoids stale closures in setInterval / RAF
  const tradesRef    = useRef(trades);
  const overridesRef = useRef(simEntryOverrides);
  const onTickRef    = useRef(onPriceUpdate);
  const onSettleRef  = useRef(onSettleTrade);
  const onWinRef     = useRef(onWinStatesChange);
  const onOhlcRef    = useRef(onOhlcChange);

  tradesRef.current    = trades;
  overridesRef.current = simEntryOverrides;
  onTickRef.current    = onPriceUpdate;
  onSettleRef.current  = onSettleTrade;
  onWinRef.current     = onWinStatesChange;
  onOhlcRef.current    = onOhlcChange;

  // ── 1. Initialize history buffer (only once per asset mount) ─────────────────
  useEffect(() => {
    if (initialPrice <= 0) return;
    if (curRef.current > 0) return; // already initialized — guard against API re-fetches

    const vol  = VOL[asset] ?? 0.001;
    const rand = mulberry32(assetSeed(asset));
    const now  = Date.now();
    let p      = initialPrice;

    const raw: number[] = [];
    for (let i = 0; i < HIST; i++) {
      raw.unshift(p);
      const mr = (initialPrice - p) * 0.06;
      p = p - (rand() - 0.5) * vol * 2 * initialPrice + mr;
      p = Math.max(Math.min(p, initialPrice * 1.06), initialPrice * 0.94);
    }

    bufRef.current = raw.map((price, i) => ({
      t: now - (HIST - i) * TICK_MS,
      p: price,
    }));
    curRef.current = initialPrice;
    settledRef.current.clear();
    entryMapRef.current.clear();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrice]);

  // ── 2. Live tick loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (initialPrice <= 0) return;

    const vol = VOL[asset] ?? 0.001;

    timerRef.current = setInterval(() => {
      const prev  = curRef.current || initialPrice;
      // Weak mean reversion to initialPrice so price doesn't drift too far
      const mr    = (initialPrice - prev) * 0.003;
      const delta = (Math.random() - 0.5) * vol * 2 * prev;
      const next  = Math.max(prev * 0.97, prev + delta + mr);
      curRef.current = next;

      const now = Date.now();
      bufRef.current.push({ t: now, p: next });
      if (bufRef.current.length > MAX_BUF) bufRef.current.shift();

      onTickRef.current?.(next);

      // ── Settlement + win-states ──────────────────────────────────────────
      const winStates: Record<string, boolean> = {};

      for (const trade of tradesRef.current) {
        // Priority: override captured at click-time → entry recorded when trade appeared
        let entry = overridesRef.current?.get(trade.id)
          ?? entryMapRef.current.get(trade.id);

        if (entry === undefined) {
          entry = next;
          entryMapRef.current.set(trade.id, next);
        }

        const isWin = trade.direction === "UP" ? next > entry : next < entry;
        winStates[trade.id] = isWin;

        const expiresMs = new Date(trade.expiresAt).getTime();
        if (now >= expiresMs && !settledRef.current.has(trade.id)) {
          settledRef.current.add(trade.id);
          const won = trade.direction === "UP" ? next > entry : next < entry;
          onSettleRef.current?.(trade.id, won);
        }
      }

      onWinRef.current?.(winStates);

      // ── OHLC from last 60 ticks ──────────────────────────────────────────
      const slice = bufRef.current.slice(-60);
      if (slice.length > 1) {
        const pp = slice.map((t) => t.p);
        onOhlcRef.current?.({
          open:  pp[0],
          high:  Math.max(...pp),
          low:   Math.min(...pp),
          close: pp[pp.length - 1],
        });
      }
    }, TICK_MS);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, initialPrice]);

  // ── 3. Remove stale entries when trade leaves ─────────────────────────────────
  useEffect(() => {
    const activeIds = new Set(trades.map((t) => t.id));
    for (const id of [...settledRef.current]) {
      if (!activeIds.has(id)) {
        settledRef.current.delete(id);
        entryMapRef.current.delete(id);
      }
    }
  }, [trades]);

  // ── 4. Canvas RAF draw loop ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dec = DEC[asset] ?? 2;

    function draw() {
      const ctx = canvas!.getContext("2d");
      if (!ctx) { rafRef.current = requestAnimationFrame(draw); return; }

      const W   = canvas!.width;
      const H   = canvas!.height;
      const buf = bufRef.current;

      // Dark background
      ctx.fillStyle = "#060c18";
      ctx.fillRect(0, 0, W, H);

      if (buf.length < 2) { rafRef.current = requestAnimationFrame(draw); return; }

      // Visible window — last 180 ticks + 2-tick right padding
      const VIS    = Math.min(180, buf.length);
      const vis    = buf.slice(-VIS);
      const wStart = vis[0].t;
      const wEnd   = vis[VIS - 1].t + TICK_MS * 2;
      const wDur   = wEnd - wStart;

      const pp   = vis.map((t) => t.p);
      const minP = Math.min(...pp);
      const maxP = Math.max(...pp);
      const rng  = maxP - minP || minP * 0.005;
      const pad  = rng * 0.2;
      const lo   = minP - pad;
      const hi   = maxP + pad;

      const toX = (ms: number) => ((ms - wStart) / wDur) * W;
      const toY = (p: number)  => H - ((p - lo) / (hi - lo)) * H;

      // ── Grid ──────────────────────────────────────────────────────────────
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

      // Price labels on right edge
      ctx.font      = "9px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.textAlign = "right";
      for (let i = 0; i <= 4; i++) {
        const price = lo + (hi - lo) * (1 - i / 4);
        ctx.fillText(price.toFixed(dec), W - 6, (i / 4) * H + 4);
      }
      ctx.textAlign = "left";

      // ── Trade annotations ──────────────────────────────────────────────────
      for (const trade of tradesRef.current) {
        const entry = overridesRef.current?.get(trade.id)
          ?? entryMapRef.current.get(trade.id);
        if (entry === undefined) continue;

        const cur   = curRef.current;
        const isWin = trade.direction === "UP" ? cur > entry : cur < entry;
        const bc    = isWin ? "rgba(16,185,129," : "rgba(239,68,68,";

        // Entry horizontal dashed line
        const yE = toY(entry);
        ctx.strokeStyle = `${bc}0.4)`;
        ctx.lineWidth   = 1;
        ctx.setLineDash([5, 7]);
        ctx.beginPath();
        ctx.moveTo(0, yE);
        ctx.lineTo(W * 0.8, yE);
        ctx.stroke();
        ctx.setLineDash([]);

        // Entry label badge
        const badge = `${trade.direction === "UP" ? "▲" : "▼"} ${entry.toFixed(dec)}`;
        ctx.font = "bold 9px monospace";
        const bw = ctx.measureText(badge).width + 8;
        const bx = W * 0.8;
        ctx.fillStyle = `${bc}0.75)`;
        ctx.fillRect(bx, yE - 9, bw, 14);
        ctx.fillStyle = "#fff";
        ctx.fillText(badge, bx + 4, yE + 2);

        // Expiry vertical dashed line
        const exMs = new Date(trade.expiresAt).getTime();
        if (exMs >= wStart && exMs <= wEnd) {
          const xEx = toX(exMs);
          ctx.strokeStyle = `${bc}0.5)`;
          ctx.lineWidth   = 1.5;
          ctx.setLineDash([3, 5]);
          ctx.beginPath(); ctx.moveTo(xEx, 0); ctx.lineTo(xEx, H); ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // ── Area fill ─────────────────────────────────────────────────────────
      const lastP  = vis[VIS - 1].p;
      const firstP = vis[0].p;
      const up     = lastP >= firstP;
      const lc     = up ? "#10b981" : "#ef4444";

      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, up ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)");
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd;
      ctx.beginPath();
      for (let i = 0; i < VIS; i++) {
        const x = toX(vis[i].t);
        const y = toY(vis[i].p);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.lineTo(toX(vis[VIS - 1].t), H);
      ctx.lineTo(toX(vis[0].t), H);
      ctx.closePath();
      ctx.fill();

      // ── Price line ─────────────────────────────────────────────────────────
      ctx.strokeStyle = lc;
      ctx.lineWidth   = 1.5;
      ctx.lineJoin    = "round";
      ctx.beginPath();
      for (let i = 0; i < VIS; i++) {
        const x = toX(vis[i].t);
        const y = toY(vis[i].p);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // ── Watermark ──────────────────────────────────────────────────────────
      ctx.save();
      ctx.globalAlpha = 0.03;
      ctx.fillStyle   = "#fff";
      ctx.font        = "bold 52px Arial";
      ctx.textAlign   = "center";
      ctx.fillText("PRIME BROKER", W / 2, H / 2 + 18);
      ctx.restore();

      // ── Current price dashed reference line ─────────────────────────────────
      const curY = toY(lastP);
      ctx.strokeStyle = up ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)";
      ctx.lineWidth   = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(0, curY); ctx.lineTo(W, curY); ctx.stroke();
      ctx.setLineDash([]);

      // Current price dot
      const dotX = toX(vis[VIS - 1].t);
      ctx.fillStyle = lc;
      ctx.beginPath();
      ctx.arc(dotX, curY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Price tag box (right edge)
      const tag = lastP.toLocaleString("en-US", {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
      });
      ctx.font = "bold 11px monospace";
      const tw = ctx.measureText(tag).width + 10;
      const ty = Math.max(13, Math.min(curY, H - 4));
      ctx.fillStyle = lc;
      ctx.fillRect(W - tw - 2, ty - 11, tw, 14);
      ctx.fillStyle = "#000";
      ctx.textAlign = "left";
      ctx.fillText(tag, W - tw + 3, ty);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [asset]); // dec is derived from asset — re-run only on asset change

  // ── 5. Resize observer ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    return () => ro.disconnect();
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
}
