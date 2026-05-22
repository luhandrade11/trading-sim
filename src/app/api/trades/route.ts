import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getCachedPrice } from "@/lib/priceCache";
import { ASSETS, VALID_DURATIONS, MIN_TRADE_AMOUNT, MAX_TRADE_AMOUNT } from "@/lib/constants";

const VALID_DIRECTIONS = ["UP", "DOWN"];
const MAX_CONCURRENT_TRADES = 10;

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!rateLimit(`trades-get:${session.user.id}`, 30, 60_000))
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });

  const trades = await prisma.trade.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(trades);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  // Rate limit: max 10 new trades per minute per user
  if (!rateLimit(`trades-post:${session.user.id}`, 10, 60_000))
    return NextResponse.json({ error: "Muitas operações em pouco tempo" }, { status: 429 });

  // Rate limit by IP as well
  if (!rateLimit(`trades-ip:${getIp(req)}`, 20, 60_000))
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const { asset, direction, amount, duration, mode: rawMode } = body;
  const mode = rawMode === "real" ? "real" : "demo";

  if (!ASSETS.includes(asset))
    return NextResponse.json({ error: "Ativo inválido" }, { status: 400 });
  if (!VALID_DIRECTIONS.includes(direction))
    return NextResponse.json({ error: "Direção inválida" }, { status: 400 });
  if (!VALID_DURATIONS.includes(duration))
    return NextResponse.json({ error: "Duração inválida" }, { status: 400 });
  if (typeof amount !== "number" || amount < MIN_TRADE_AMOUNT || amount > MAX_TRADE_AMOUNT)
    return NextResponse.json({ error: `Valor deve ser entre $${MIN_TRADE_AMOUNT} e $${MAX_TRADE_AMOUNT}` }, { status: 400 });

  // Use server-side cached price — never trust client entryPrice
  const entryPrice = getCachedPrice(asset);
  if (!entryPrice || entryPrice <= 0)
    return NextResponse.json({ error: "Preço indisponível, tente novamente" }, { status: 503 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  const activeBalance = mode === "real" ? user.realBalance : user.balance;
  if (activeBalance < amount)
    return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });

  // Enforce max concurrent trades
  const openCount = await prisma.trade.count({
    where: { userId: session.user.id, result: "PENDING" },
  });
  if (openCount >= MAX_CONCURRENT_TRADES)
    return NextResponse.json({ error: `Máximo de ${MAX_CONCURRENT_TRADES} operações simultâneas` }, { status: 400 });

  const expiresAt = new Date(Date.now() + duration * 1000);

  const [trade] = await prisma.$transaction([
    prisma.trade.create({
      data: { userId: session.user.id, asset, direction, amount, entryPrice, duration, expiresAt, mode },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: mode === "real"
        ? { realBalance: { decrement: amount } }
        : { balance:     { decrement: amount } },
    }),
  ]);

  return NextResponse.json(trade);
}
