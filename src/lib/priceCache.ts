export type PriceMap = Record<string, { price: number; change24h: number }>;

// Hardcoded fallbacks used when the live cache is cold (serverless cold starts)
export const FALLBACK_PRICES: PriceMap = {
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

let cache: { data: PriceMap; expiresAt: number } | null = null;

export function getCachedPrices(): PriceMap | null {
  if (cache && Date.now() < cache.expiresAt) return cache.data;
  return null;
}

export function setCachedPrices(data: PriceMap): void {
  cache = { data, expiresAt: Date.now() + 30_000 };
}

export function getCachedPrice(symbol: string): number | null {
  return getCachedPrices()?.[symbol]?.price ?? null;
}

// Always returns a price: live cache → fallback. Never fails for known assets.
export function getPrice(symbol: string): number | null {
  return getCachedPrice(symbol) ?? FALLBACK_PRICES[symbol]?.price ?? null;
}
