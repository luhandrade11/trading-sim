export const PAYOUT_RATE = 0.85;
export const STARTING_BALANCE = 990; // ≈ R$5.000 (display rate 5.05)
export const MAX_TRADE_AMOUNT = 10000;
export const MIN_TRADE_AMOUNT = 1;
export const MAX_EXIT_PRICE_MULTIPLIER = 1000;

// Only volatile assets — required for continuous chart movement and gamification
export const ALL_ASSETS = [
  { symbol: "BTC/USD",  name: "Bitcoin",    type: "crypto" as const },
  { symbol: "ETH/USD",  name: "Ethereum",   type: "crypto" as const },
  { symbol: "SOL/USD",  name: "Solana",     type: "crypto" as const },
  { symbol: "BNB/USD",  name: "BNB Chain",  type: "crypto" as const },
  { symbol: "XRP/USD",  name: "XRP",        type: "crypto" as const },
  { symbol: "DOGE/USD", name: "Dogecoin",   type: "crypto" as const },
  { symbol: "AVAX/USD", name: "Avalanche",  type: "crypto" as const },
  { symbol: "LINK/USD", name: "Chainlink",  type: "crypto" as const },
  { symbol: "EUR/USD",  name: "Euro",       type: "forex"  as const },
  { symbol: "GBP/USD",  name: "GBP",        type: "forex"  as const },
  { symbol: "USD/JPY",  name: "USD/Iene",   type: "forex"  as const },
  { symbol: "GBP/JPY",  name: "GBP/Iene",   type: "forex"  as const },
];

export const ASSETS = ALL_ASSETS.map((a) => a.symbol);

export const DEFAULT_TABS = ["BTC/USD", "ETH/USD", "SOL/USD", "EUR/USD", "GBP/JPY"];

export const DURATIONS = [
  { label: "5s",  value: 5   },
  { label: "30s", value: 30  },
  { label: "1m",  value: 60  },
  { label: "2m",  value: 120 },
  { label: "5m",  value: 300 },
] as const;

export const VALID_DURATIONS = DURATIONS.map((d) => d.value);

export const ASSET_SPREAD: Record<string, number> = {
  "BTC/USD":  0.0003,
  "ETH/USD":  0.0004,
  "EUR/USD":  0.00005,
  "GBP/USD":  0.00006,
  "USD/JPY":  0.002,
  "GBP/JPY":  0.003,
};
export function getSpread(asset: string): number {
  return ASSET_SPREAD[asset] ?? 0.0002;
}
