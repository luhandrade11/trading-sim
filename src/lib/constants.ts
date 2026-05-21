export const PAYOUT_RATE = 0.85;
export const STARTING_BALANCE = 1000;
export const MAX_TRADE_AMOUNT = 10000;
export const MIN_TRADE_AMOUNT = 1;
export const MAX_EXIT_PRICE_MULTIPLIER = 1000;

export const ASSETS = [
  "BTC/USD", "ETH/USD", "SOL/USD", "BNB/USD", "XRP/USD",
  "EUR/USD", "GBP/USD", "AUD/USD", "USD/JPY", "USD/BRL",
] as const;

export type AssetSymbol = (typeof ASSETS)[number];

export const ASSET_TYPE: Record<string, "crypto" | "forex"> = {
  "BTC/USD": "crypto", "ETH/USD": "crypto", "SOL/USD": "crypto",
  "BNB/USD": "crypto", "XRP/USD": "crypto",
  "EUR/USD": "forex",  "GBP/USD": "forex",  "AUD/USD": "forex",
  "USD/JPY": "forex",  "USD/BRL": "forex",
};

export const DURATIONS = [
  { label: "30s", value: 30  },
  { label: "1m",  value: 60  },
  { label: "2m",  value: 120 },
  { label: "5m",  value: 300 },
] as const;

export const VALID_DURATIONS = DURATIONS.map((d) => d.value);
