import { NextResponse } from "next/server";

const COINGECKO_ASSETS = [
  { id: "bitcoin",      symbol: "BTC/USD" },
  { id: "ethereum",     symbol: "ETH/USD" },
  { id: "solana",       symbol: "SOL/USD" },
  { id: "binancecoin",  symbol: "BNB/USD" },
  { id: "ripple",       symbol: "XRP/USD" },
];

const FALLBACKS: Record<string, { price: number; change24h: number }> = {
  "BTC/USD": { price: 105000, change24h: 0 },
  "ETH/USD": { price: 2500,   change24h: 0 },
  "SOL/USD": { price: 175,    change24h: 0 },
  "BNB/USD": { price: 620,    change24h: 0 },
  "XRP/USD": { price: 0.55,   change24h: 0 },
  "EUR/USD": { price: 1.0850, change24h: 0 },
  "GBP/USD": { price: 1.2700, change24h: 0 },
  "AUD/USD": { price: 0.6450, change24h: 0 },
  "USD/JPY": { price: 149.50, change24h: 0 },
  "USD/BRL": { price: 5.75,   change24h: 0 },
};

export async function GET() {
  const prices: Record<string, { price: number; change24h: number }> = { ...FALLBACKS };

  // Crypto via CoinGecko
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
            price: data[asset.id].usd,
            change24h: data[asset.id].usd_24h_change ?? 0,
          };
        }
      }
    }
  } catch { /* use fallbacks */ }

  // Forex via Frankfurter (base = USD)
  // 1 USD = rate.EUR → EUR/USD = 1/rate.EUR
  // 1 USD = rate.GBP → GBP/USD = 1/rate.GBP
  // 1 USD = rate.AUD → AUD/USD = 1/rate.AUD
  // 1 USD = rate.JPY → USD/JPY = rate.JPY
  // 1 USD = rate.BRL → USD/BRL = rate.BRL
  try {
    const forexRes = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,AUD,JPY,BRL",
      { next: { revalidate: 0 }, signal: AbortSignal.timeout(5000) }
    );
    if (forexRes.ok) {
      const forex = await forexRes.json();
      const r = forex.rates ?? {};
      if (r.EUR) prices["EUR/USD"] = { price: 1 / r.EUR, change24h: 0 };
      if (r.GBP) prices["GBP/USD"] = { price: 1 / r.GBP, change24h: 0 };
      if (r.AUD) prices["AUD/USD"] = { price: 1 / r.AUD, change24h: 0 };
      if (r.JPY) prices["USD/JPY"] = { price: r.JPY,     change24h: 0 };
      if (r.BRL) prices["USD/BRL"] = { price: r.BRL,     change24h: 0 };
    }
  } catch { /* use fallbacks */ }

  return NextResponse.json(prices);
}
