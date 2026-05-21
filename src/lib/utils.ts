export function formatPrice(price: number, asset: string): string {
  if (!price) return "—";
  // JPY pairs: 3 decimal places
  if (asset === "USD/JPY" || asset === "EUR/JPY" || asset === "GBP/JPY") return price.toFixed(3);
  // Large prices (BTC, ETH…)
  if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Mid-range (SOL, BNB, LTC, USD/CAD, USD/CHF…)
  if (price >= 10) return price.toFixed(2);
  // Forex majors and small-cap crypto
  return price.toFixed(5);
}

interface TradeForStats {
  result: string;
  profit: number;
  amount: number;
}

export function computeStats(trades: TradeForStats[]) {
  const settled = trades.filter((t) => t.result !== "PENDING");
  const wins    = settled.filter((t) => t.result === "WIN");
  const losses  = settled.filter((t) => t.result === "LOSS");
  const totalProfit   = wins.reduce((s, t) => s + t.profit, 0);
  const totalLost     = losses.reduce((s, t) => s + t.amount, 0);
  const totalInvested = settled.reduce((s, t) => s + t.amount, 0);
  const pnl     = totalProfit - totalLost;
  const winRate = settled.length > 0 ? (wins.length / settled.length) * 100 : 0;

  let streak = 0;
  let streakType: "WIN" | "LOSS" | null = null;
  for (const t of [...settled].reverse()) {
    if (streakType === null) { streakType = t.result as "WIN" | "LOSS"; streak = 1; }
    else if (t.result === streakType) streak++;
    else break;
  }

  return { settled: settled.length, wins: wins.length, losses: losses.length, pnl, winRate, totalInvested, totalProfit, totalLost, streak, streakType };
}
