// Poll payment status — called by frontend every few seconds
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

const ABACATE_BASE = "https://api.abacatepay.com/v2";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!rateLimit(`abacate-status:${session.user.id}`, 30, 60_000))
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });

  const id  = req.nextUrl.searchParams.get("id");
  if (!id)  return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const key = process.env.ABACATEPAY_API_KEY;
  if (!key) return NextResponse.json({ status: "UNKNOWN" });

  const ac   = new AbortController();
  const tid  = setTimeout(() => ac.abort(), 8_000);
  let res: Response;
  try {
    res = await fetch(`${ABACATE_BASE}/transparents/check?id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: ac.signal,
    });
  } catch {
    clearTimeout(tid);
    return NextResponse.json({ status: "UNKNOWN" });
  }
  clearTimeout(tid);

  const data = await res.json();
  if (!res.ok || !data.success) return NextResponse.json({ status: "UNKNOWN" });

  return NextResponse.json({ status: data.data?.status ?? "UNKNOWN" });
}
