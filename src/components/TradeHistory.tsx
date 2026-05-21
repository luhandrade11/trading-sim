"use client";

interface Trade {
  id: string;
  asset: string;
  direction: string;
  amount: number;
  entryPrice: number;
  exitPrice: number | null;
  result: string;
  profit: number;
  createdAt: string;
}

interface Props {
  trades: Trade[];
}

export default function TradeHistory({ trades }: Props) {
  const settled = trades.filter((t) => t.result !== "PENDING");

  if (settled.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <div className="text-3xl">🕐</div>
        <p className="text-gray-600 text-sm text-center">
          Nenhuma operação finalizada ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {settled.map((trade) => {
        const won = trade.result === "WIN";
        return (
          <div
            key={trade.id}
            className={`rounded-lg p-3 border ${
              won
                ? "bg-green-500/5 border-green-500/20"
                : "bg-red-500/5 border-red-500/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold ${won ? "text-green-400" : "text-red-400"}`}
                >
                  {won ? "✓ GANHOU" : "✗ PERDEU"}
                </span>
                <span className="text-gray-400 text-xs">{trade.asset}</span>
                <span
                  className={`text-xs ${
                    trade.direction === "UP" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {trade.direction === "UP" ? "▲" : "▼"}
                </span>
              </div>
              <div className="text-right">
                <span
                  className={`text-sm font-semibold ${won ? "text-green-400" : "text-red-400"}`}
                >
                  {won ? `+$${trade.profit.toFixed(2)}` : `-$${trade.amount.toFixed(2)}`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
              <span>
                $
                {trade.entryPrice.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}
              </span>
              <span>→</span>
              <span>
                $
                {(trade.exitPrice ?? 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}
              </span>
              <span className="ml-auto">
                {new Date(trade.createdAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
