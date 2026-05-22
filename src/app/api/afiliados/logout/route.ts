import { NextResponse } from "next/server";
import { AFFILIATE_COOKIE } from "@/lib/affiliateAuth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AFFILIATE_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
