export type PriceMap = Record<string, { price: number; change24h: number }>;

let cache: { data: PriceMap; expiresAt: number } | null = null;

export function getCachedPrices(): PriceMap | null {
  if (cache && Date.now() < cache.expiresAt) return cache.data;
  return null;
}

export function setCachedPrices(data: PriceMap): void {
  cache = { data, expiresAt: Date.now() + 30_000 };
}

export function getCachedPrice(symbol: string): number | null {
  const cached = getCachedPrices();
  return cached?.[symbol]?.price ?? null;
}
