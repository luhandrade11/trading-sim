export function formatPrice(price: number, asset: string): string {
  if (!price) return "—";
  if (asset === "USD/JPY") return price.toFixed(3);
  if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 10) return price.toFixed(2);
  if (price >= 1) return price.toFixed(5);
  return price.toFixed(5);
}

interface TradeForStats {
  result: string;
  profit: number;
  amount: number;
}

export function computeStats(trades: TradeForStats[]) {
  const settled = trades.filter((t) => t.result !== "PENDING");
  const wins = settled.filter((t) => t.result === "WIN");
  const losses = settled.filter((t) => t.result === "LOSS");
  const totalProfit = wins.reduce((s, t) => s + t.profit, 0);
  const totalLost = losses.reduce((s, t) => s + t.amount, 0);
  const totalInvested = settled.reduce((s, t) => s + t.amount, 0);
  const pnl = totalProfit - totalLost;
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
