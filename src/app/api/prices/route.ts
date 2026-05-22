import { NextRequest, NextResponse } from "next/server";
import { getCachedPrices, setCachedPrices, type PriceMap } from "@/lib/priceCache";
import { rateLimit } from "@/lib/rateLimit";

const COINGECKO_ASSETS = [
  { id: "bitcoin",       symbol: "BTC/USD"   },
  { id: "ethereum",      symbol: "ETH/USD"   },
  { id: "solana",        symbol: "SOL/USD"   },
  { id: "binancecoin",   symbol: "BNB/USD"   },
  { id: "ripple",        symbol: "XRP/USD"   },
  { id: "cardano",       symbol: "ADA/USD"   },
  { id: "dogecoin",      symbol: "DOGE/USD"  },
  { id: "avalanche-2",   symbol: "AVAX/USD"  },
  { id: "polkadot",      symbol: "DOT/USD"   },
  { id: "chainlink",     symbol: "LINK/USD"  },
  { id: "litecoin",      symbol: "LTC/USD"   },
  { id: "matic-network", symbol: "MATIC/USD" },
];

const FALLBACKS: PriceMap = {
  "BTC/USD":   { price: 105000, change24h: 0 },
  "ETH/USD":   { price: 2500,   change24h: 0 },
  "SOL/USD":   { price: 175,    change24h: 0 },
  "BNB/USD":   { price: 620,    change24h: 0 },
  "XRP/USD":   { price: 0.55,   change24h: 0 },
  "ADA/USD":   { price: 0.45,   change24h: 0 },
  "DOGE/USD":  { price: 0.12,   change24h: 0 },
  "AVAX/USD":  { price: 35,     change24h: 0 },
  "DOT/USD":   { price: 7.5,    change24h: 0 },
  "LINK/USD":  { price: 14,     change24h: 0 },
  "LTC/USD":   { price: 90,     change24h: 0 },
  "MATIC/USD": { price: 0.55,   change24h: 0 },
  "EUR/USD":   { price: 1.0850, change24h: 0 },
  "GBP/USD":   { price: 1.2700, change24h: 0 },
  "AUD/USD":   { price: 0.6450, change24h: 0 },
  "USD/JPY":   { price: 149.50, change24h: 0 },
  "USD/BRL":   { price: 5.75,   change24h: 0 },
  "USD/CHF":   { price: 0.9020, change24h: 0 },
  "USD/CAD":   { price: 1.3650, change24h: 0 },
  "NZD/USD":   { price: 0.6050, change24h: 0 },
  "EUR/GBP":   { price: 0.8540, change24h: 0 },
  "GBP/JPY":   { price: 189.80, change24h: 0 },
};

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!rateLimit(`prices:${ip}`, 60, 60_000))
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });

  // Serve cache if still fresh
  const cached = getCachedPrices();
  if (cached) return NextResponse.json(cached);

  const prices: PriceMap = { ...FALLBACKS };

  // ── Cripto via CoinGecko ─────────────────────────────────────────────
  try {
    const ids = COINGECKO_ASSETS.map((a) => a.id).join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 0 }, signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data = await res.json();
      for (const asset of COINGECKO_ASSETS) {
        if (data[asset.id]?.usd) {
          prices[asset.symbol] = {
            price:     data[asset.id].usd,
            change24h: data[asset.id].usd_24h_change ?? 0,
          };
        }
      }
    }
  } catch { /* use fallbacks */ }

  // ── Forex via Frankfurter ────────────────────────────────────────────
  try {
    const forexRes = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,AUD,JPY,BRL,CHF,CAD,NZD",
      { next: { revalidate: 0 }, signal: AbortSignal.timeout(5000) }
    );
    if (forexRes.ok) {
      const forex = await forexRes.json();
      const r = forex.rates ?? {};
      if (r.EUR) prices["EUR/USD"] = { price: 1 / r.EUR,              change24h: 0 };
      if (r.GBP) prices["GBP/USD"] = { price: 1 / r.GBP,              change24h: 0 };
      if (r.AUD) prices["AUD/USD"] = { price: 1 / r.AUD,              change24h: 0 };
      if (r.NZD) prices["NZD/USD"] = { price: 1 / r.NZD,              change24h: 0 };
      if (r.JPY) prices["USD/JPY"] = { price: r.JPY,                   change24h: 0 };
      if (r.BRL) prices["USD/BRL"] = { price: r.BRL,                   change24h: 0 };
      if (r.CHF) prices["USD/CHF"] = { price: r.CHF,                   change24h: 0 };
      if (r.CAD) prices["USD/CAD"] = { price: r.CAD,                   change24h: 0 };
      if (r.GBP && r.EUR) prices["EUR/GBP"] = { price: r.GBP / r.EUR,  change24h: 0 };
      if (r.JPY && r.GBP) prices["GBP/JPY"] = { price: r.JPY / r.GBP,  change24h: 0 };
    }
  } catch { /* use fallbacks */ }

  setCachedPrices(prices);
  return NextResponse.json(prices);
}
