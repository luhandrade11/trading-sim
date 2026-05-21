export const PAYOUT_RATE = 0.85;
export const STARTING_BALANCE = 1000;
export const MAX_TRADE_AMOUNT = 10000;
export const MIN_TRADE_AMOUNT = 1;
export const MAX_EXIT_PRICE_MULTIPLIER = 1000; // sanity cap: exit price can't be > 1000x entry

export const ASSETS = ["BTC/USD", "ETH/USD", "SOL/USD", "EUR/USD", "USD/BRL"] as const;
export type AssetSymbol = (typeof ASSETS)[number];

export const DURATIONS = [
  { label: "30s", value: 30 },
  { label: "1min", value: 60 },
  { label: "2min", value: 120 },
  { label: "5min", value: 300 },
] as const;

export const VALID_DURATIONS = DURATIONS.map((d) => d.value);
