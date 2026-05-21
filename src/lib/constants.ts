export const PAYOUT_RATE = 0.85;
export const STARTING_BALANCE = 1000;
export const MAX_TRADE_AMOUNT = 10000;
export const MIN_TRADE_AMOUNT = 1;
export const MAX_EXIT_PRICE_MULTIPLIER = 1000;

// Full catalogue of tradeable assets
export const ALL_ASSETS = [
  // ── Cripto ──────────────────────────────────────────────────────────
  { symbol: "BTC/USD",   name: "Bitcoin",            type: "crypto" as const },
  { symbol: "ETH/USD",   name: "Ethereum",           type: "crypto" as const },
  { symbol: "SOL/USD",   name: "Solana",             type: "crypto" as const },
  { symbol: "BNB/USD",   name: "BNB Chain",          type: "crypto" as const },
  { symbol: "XRP/USD",   name: "XRP",                type: "crypto" as const },
  { symbol: "ADA/USD",   name: "Cardano",            type: "crypto" as const },
  { symbol: "DOGE/USD",  name: "Dogecoin",           type: "crypto" as const },
  { symbol: "AVAX/USD",  name: "Avalanche",          type: "crypto" as const },
  { symbol: "DOT/USD",   name: "Polkadot",           type: "crypto" as const },
  { symbol: "LINK/USD",  name: "Chainlink",          type: "crypto" as const },
  { symbol: "LTC/USD",   name: "Litecoin",           type: "crypto" as const },
  { symbol: "MATIC/USD", name: "Polygon",            type: "crypto" as const },
  // ── Forex ───────────────────────────────────────────────────────────
  { symbol: "EUR/USD",   name: "Euro",               type: "forex" as const },
  { symbol: "GBP/USD",   name: "British Pound",      type: "forex" as const },
  { symbol: "AUD/USD",   name: "Australian Dollar",  type: "forex" as const },
  { symbol: "USD/JPY",   name: "Japanese Yen",       type: "forex" as const },
  { symbol: "USD/BRL",   name: "Brazilian Real",     type: "forex" as const },
  { symbol: "USD/CHF",   name: "Swiss Franc",        type: "forex" as const },
  { symbol: "USD/CAD",   name: "Canadian Dollar",    type: "forex" as const },
  { symbol: "NZD/USD",   name: "New Zealand Dollar", type: "forex" as const },
  { symbol: "EUR/GBP",   name: "Euro / Libra",       type: "forex" as const },
  { symbol: "GBP/JPY",   name: "Libra / Iene",       type: "forex" as const },
];

// Flat symbol list (used for API validation)
export const ASSETS = ALL_ASSETS.map((a) => a.symbol);

// Tabs opened by default on first visit
export const DEFAULT_TABS = ["BTC/USD", "ETH/USD", "EUR/USD", "GBP/USD", "SOL/USD"];

export const DURATIONS = [
  { label: "30s", value: 30  },
  { label: "1m",  value: 60  },
  { label: "2m",  value: 120 },
  { label: "5m",  value: 300 },
] as const;

export const VALID_DURATIONS = DURATIONS.map((d) => d.value);
