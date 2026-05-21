import { NextResponse } from "next/server";

const COINGECKO_ASSETS = [
  { id: "bitcoin", symbol: "BTC/USD" },
  { id: "ethereum", symbol: "ETH/USD" },
  { id: "solana", symbol: "SOL/USD" },
];

// Fallback prices if APIs are down
const FALLBACKS: Record<string, { price: number; change24h: number }> = {
  "BTC/USD": { price: 105000, change24h: 0 },
  "ETH/USD": { price: 2500, change24h: 0 },
  "SOL/USD": { price: 175, change24h: 0 },
  "EUR/USD": { price: 1.085, change24h: 0 },
  "USD/BRL": { price: 5.75, change24h: 0 },
};

export async function GET() {
  const prices: Record<string, { price: number; change24h: number }> = {
    ...FALLBACKS,
  };

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
  } catch {
    // use fallbacks for crypto
  }

  try {
    const forexRes = await fetch(
      "https://api.frankfurter.app/latest?from=EUR&to=USD,BRL",
      { next: { revalidate: 0 }, signal: AbortSignal.timeout(5000) }
    );
    if (forexRes.ok) {
      const forex = await forexRes.json();
      if (forex.rates?.USD) prices["EUR/USD"] = { price: forex.rates.USD, change24h: 0 };
      if (forex.rates?.BRL) prices["USD/BRL"] = { price: 1 / (forex.rates.USD / forex.rates.BRL), change24h: 0 };
    }
  } catch {
    // use fallbacks for forex
  }

  return NextResponse.json(prices);
}
