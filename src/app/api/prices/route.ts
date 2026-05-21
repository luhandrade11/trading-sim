import { NextResponse } from "next/server";

const ASSETS = [
  { id: "bitcoin", symbol: "BTC/USD" },
  { id: "ethereum", symbol: "ETH/USD" },
  { id: "solana", symbol: "SOL/USD" },
];

export async function GET() {
  try {
    const ids = ASSETS.map((a) => a.id).join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 10 } }
    );

    if (!res.ok) throw new Error("CoinGecko error");
    const data = await res.json();

    const prices: Record<string, { price: number; change24h: number }> = {};
    for (const asset of ASSETS) {
      prices[asset.symbol] = {
        price: data[asset.id]?.usd ?? 0,
        change24h: data[asset.id]?.usd_24h_change ?? 0,
      };
    }

    // Forex via Frankfurter
    const forexRes = await fetch(
      "https://api.frankfurter.app/latest?from=EUR&to=USD,BRL",
      { next: { revalidate: 60 } }
    );
    if (forexRes.ok) {
      const forex = await forexRes.json();
      prices["EUR/USD"] = { price: forex.rates?.USD ?? 1.08, change24h: 0 };
      prices["USD/BRL"] = { price: forex.rates?.BRL ?? 5.1, change24h: 0 };
    }

    return NextResponse.json(prices);
  } catch {
    return NextResponse.json(
      { error: "Erro ao buscar preços" },
      { status: 500 }
    );
  }
}
