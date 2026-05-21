export interface Trade {
  id: string;
  asset: string;
  direction: string;
  amount: number;
  entryPrice: number;
  exitPrice: number | null;
  duration: number;
  result: string;
  profit: number;
  createdAt: string;
  expiresAt: string;
}
