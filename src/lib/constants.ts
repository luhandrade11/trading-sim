export const PAYOUT_RATE = 0.85; // 85% return on win
export const STARTING_BALANCE = 1000;
export const ASSETS = ["BTC/USD", "ETH/USD", "SOL/USD", "EUR/USD", "USD/BRL"] as const;
export const DURATIONS = [
  { label: "30s", value: 30 },
  { label: "1min", value: 60 },
  { label: "2min", value: 120 },
  { label: "5min", value: 300 },
] as const;
