"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const BRL_RATE = 5.20; // client-side estimate for display only

function isBrazilianUser(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (
      tz.startsWith("America/Sao_Paulo") || tz.startsWith("America/Recife") ||
      tz.startsWith("America/Fortaleza") || tz.startsWith("America/Belem") ||
      tz.startsWith("America/Manaus") || tz.startsWith("America/Porto_Velho") ||
      tz.startsWith("America/Rio_Branco") || tz.startsWith("America/Boa_Vista") ||
      tz.startsWith("America/Araguaina") || tz.startsWith("America/Bahia") ||
      tz.startsWith("America/Cuiaba") || tz.startsWith("America/Campo_Grande") ||
      tz.startsWith("America/Noronha")
    ) return true;
    if ((navigator.language || "").startsWith("pt-BR")) return true;
  } catch {}
  return false;
}

// ─── Step 1: Amount ────────────────────────────────────────────────────────────
function AmountStep({ onNext, isBR }: { onNext: (amount: number) => void; isBR: boolean }) {
  const [amount, setAmount] = useState(isBR ? 20 : 5);
  const presets = isBR ? [20, 50, 100, 200, 500, 1000] : [5, 20, 50, 100, 200, 500];
  const minVal  = isBR ? 20 : 4;

  const bonus = amount >= 500 ? Math.round(amount * 0.5)
              : amount >= 200 ? Math.round(amount * 0.25)
              : amount;

  const prefix = isBR ? "R$" : "$";
  const suffix = isBR ? "BRL" : "USD";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Depositar</h1>
        <p className="text-sm text-white/30 mt-1">Quanto você quer depositar?</p>
      </div>

      {/* Promo banner */}
      <div className="relative overflow-hidden rounded-2xl"
        style={{ background: "linear-gradient(135deg,#1a1040 0%,#2d1b6e 50%,#1a0f3c 100%)" }}>
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(ellipse at 80% 50%,#7c3aed 0%,transparent 60%)" }} />
        <div className="relative flex items-center gap-4 p-4 sm:p-5">
          <div className="text-3xl sm:text-4xl">⚡</div>
          <div className="flex-1">
            <div className="text-white font-black text-sm sm:text-base">Primeiro depósito dobrado!</div>
            <div className="text-violet-300/80 text-xs mt-1">
              Use o código <span className="font-bold text-white">COPA100K</span> e receba 100% de bônus.
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 shrink-0 px-3 py-1.5 bg-white/15 border border-white/20 rounded-xl text-xs font-mono font-bold text-white">
            COPA100K
          </div>
        </div>
      </div>

      {/* Amount card */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5 space-y-4">
        <div className="text-xs font-bold text-white/40 uppercase tracking-widest">
          Valor ({suffix})
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {presets.map(p => (
            <button key={p} onClick={() => setAmount(p)}
              className={`py-2.5 rounded-xl text-sm font-bold transition-all border ${
                amount === p
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  : "bg-white/3 text-white/40 border-white/8 hover:border-white/15 hover:text-white"
              }`}>
              {prefix}{p}
            </button>
          ))}
        </div>
        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-emerald-400/40 transition-colors">
          <span className="pl-4 text-white/40 text-sm font-medium">{prefix}</span>
          <input type="number" min={minVal} value={amount}
            onChange={e => setAmount(Math.max(minVal, Number(e.target.value)))}
            className="flex-1 bg-transparent px-2 py-3.5 text-white text-base font-bold focus:outline-none" />
          <span className="pr-4 text-white/20 text-xs">{suffix}</span>
        </div>


        {amount >= 200 && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
            <span className="text-emerald-400">🎁</span>
            <span className="text-emerald-300 text-xs font-medium">
              Bônus de +{amount >= 500 ? "50" : "25"}% incluso para esse valor!
            </span>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Você deposita", val: `${prefix}${amount}`,         accent: "text-white" },
          { label: "Bônus",         val: `+${prefix}${bonus}`,         accent: "text-emerald-400" },
          { label: "Total",         val: `${prefix}${amount + bonus}`, accent: "text-amber-400" },
        ].map(item => (
          <div key={item.label} className="bg-white/3 border border-white/8 rounded-2xl p-4">
            <div className={`text-lg font-black ${item.accent}`}>{item.val}</div>
            <div className="text-[9px] text-white/30 mt-1 uppercase tracking-wider">{item.label}</div>
          </div>
        ))}
      </div>

      <button onClick={() => onNext(amount)}
        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-base rounded-2xl transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2">
        Continuar — {prefix}{amount}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <p className="text-center text-[9px] text-white/20">
        Depósito mínimo: {prefix}{minVal} · Seguro e criptografado
      </p>
    </div>
  );
}

// ─── Step 2: Method ────────────────────────────────────────────────────────────
function MethodStep({
  amount, isBR, onBack, onPix, onCard,
}: {
  amount: number; isBR: boolean; onBack: () => void;
  onPix: () => void; onCard: () => void;
}) {
  const prefix = isBR ? "R$" : "$";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-black text-white">Método de pagamento</h1>
          <p className="text-sm text-white/30">
            Depósito de <span className="text-emerald-400 font-bold">{prefix}{amount}</span>
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {/* PIX — Brazil only */}
        {isBR && (
          <button onClick={onPix}
            className="flex items-center gap-3 p-4 bg-white/3 border border-emerald-500/20 rounded-2xl hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-left group w-full">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-2xl font-black text-emerald-400 shrink-0">
              ⚡
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">PIX</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-full font-semibold">Recomendado</span>
              </div>
              <div className="text-[10px] text-white/30 mt-0.5">Chave CPF · email · telefone</div>
            </div>
            <div className="shrink-0">
              <div className="text-[9px] font-semibold px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400">Instantâneo</div>
            </div>
            <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Credit / Debit Card */}
        <button onClick={onCard}
          className="flex items-center gap-3 p-4 bg-white/3 border border-white/8 rounded-2xl hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-left group w-full">
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">Cartão de Crédito / Débito</div>
            <div className="text-[10px] text-white/30 mt-0.5">Visa · Mastercard · Elo · American Express</div>
          </div>
          <div className="shrink-0">
            <div className="text-[9px] font-semibold px-2 py-1 rounded-full bg-white/5 text-white/30">1–3 min</div>
          </div>
          <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Apple Pay */}
        <button onClick={onCard}
          className="flex items-center gap-3 p-4 bg-white/3 border border-white/8 rounded-2xl hover:border-white/20 hover:bg-white/5 transition-all text-left group w-full">
          <div className="w-12 h-12 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
            {/* Apple logo */}
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-white group-hover:text-white transition-colors">Apple Pay</div>
            <div className="text-[10px] text-white/30 mt-0.5">Face ID · Touch ID · Um toque</div>
          </div>
          <div className="shrink-0">
            <div className="text-[9px] font-semibold px-2 py-1 rounded-full bg-white/5 text-white/30">1–3 min</div>
          </div>
          <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="text-center py-2">
        <p className="text-[10px] text-white/20">
          Outro método?{" "}
          <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer"
            className="text-amber-400/60 hover:text-amber-400 transition-colors">
            Fale com o suporte
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── PIX Modal — AbacatePay inline QR code ────────────────────────────────────
type PixCharge = {
  id: string; brCode: string; brCodeBase64: string;
  amountBrl: string; amountUsd: number; expiresAt: string;
};

function PixModal({ onClose, amount, isBR }: { onClose: () => void; amount: number; isBR: boolean }) {
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [charge,   setCharge]   = useState<PixCharge | null>(null);
  const [copied,   setCopied]   = useState(false);
  const [paid,     setPaid]     = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    async function create() {
      try {
        // For BR users the amount is already in BRL; otherwise it's USD
        const body = isBR
          ? { amountBrl: amount }
          : { amount };

        const res  = await fetch("/api/payments/abacatepay/create", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Erro ao gerar PIX"); setLoading(false); return; }
        setCharge(data);
        setLoading(false);

        pollRef.current = setInterval(async () => {
          try {
            const r = await fetch(`/api/payments/abacatepay/status?id=${data.id}`);
            const s = await r.json();
            if (s.status === "PAID" || s.status === "APPROVED" || s.status === "COMPLETED") {
              clearInterval(pollRef.current);
              setPaid(true);
            }
          } catch { /* ignore poll errors */ }
        }, 4000);
      } catch {
        setError("Erro de conexão. Tente novamente.");
        setLoading(false);
      }
    }
    create();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyCode() {
    if (!charge?.brCode) return;
    await navigator.clipboard.writeText(charge.brCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={paid ? onClose : undefined} />
      <div className="relative bg-[#0d1117] border border-white/10 rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all z-10">✕</button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-2xl shrink-0">⚡</div>
          <div>
            <div className="text-white font-bold">PIX</div>
            <div className="text-[10px] text-white/30">Depósito instantâneo · AbacatePay</div>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="w-10 h-10 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
            <p className="text-white/40 text-xs">Gerando código PIX…</p>
          </div>
        )}

        {!loading && error && (
          <div className="space-y-3">
            <p className="text-rose-400 text-sm text-center">{error}</p>
            <button onClick={onClose}
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white/60 text-sm rounded-xl transition-all">
              Fechar
            </button>
          </div>
        )}

        {paid && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-4xl">✅</div>
            <div className="text-center">
              <div className="text-white font-black text-lg">Pagamento confirmado!</div>
              <div className="text-emerald-400 text-sm mt-1">R$ {charge?.amountBrl} creditado na sua conta real</div>
            </div>
            <button onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold rounded-xl text-sm">
              Continuar operando
            </button>
          </div>
        )}

        {!loading && !error && !paid && charge && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-3 bg-white/3 border border-white/8 rounded-xl">
                <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Você paga</div>
                <div className="text-xl font-black text-white">R$ {charge.amountBrl}</div>
              </div>
              <div className="p-3 bg-white/3 border border-white/8 rounded-xl">
                <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Você recebe</div>
                <div className="text-xl font-black text-emerald-400">R$ {charge.amountBrl}</div>
              </div>
            </div>

            {charge.brCodeBase64 && (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={charge.brCodeBase64}
                  alt="QR Code PIX"
                  className="w-44 h-44 rounded-xl border border-white/10 bg-white p-1"
                />
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-white/30 text-[10px]">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Aguardando pagamento…
            </div>

            <div className="space-y-1">
              <div className="text-[9px] text-white/30 uppercase tracking-wider">PIX Copia e Cola</div>
              <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl">
                <span className="flex-1 text-[9px] font-mono text-white/50 truncate">{charge.brCode}</span>
                <button onClick={copyCode}
                  className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    copied ? "bg-emerald-500/20 text-emerald-400" : "bg-white/8 text-white/40 hover:text-white"
                  }`}>
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
            </div>

            <p className="text-center text-[9px] text-white/20">
              Válido por 1 hora · Saldo creditado automaticamente após pagamento
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Card Modal ────────────────────────────────────────────────────────────────
function CardModal({ onClose, amount, isBR }: { onClose: () => void; amount: number; isBR: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const prefix      = isBR ? "R$" : "$";
  const amountBRL   = isBR ? amount : null;
  const amountUSD   = isBR ? (amount / BRL_RATE).toFixed(2) : amount;

  async function handle() {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/stripe/create-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: isBR ? "brl" : "usd",
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError(data.error ?? "Erro ao criar sessão de pagamento");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0d1117] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">✕</button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <div className="text-white font-bold">Cartão / Apple Pay</div>
            <div className="text-[10px] text-white/30">Visa · Mastercard · Elo · 🍎 Apple Pay</div>
          </div>
        </div>

        {/* Amount display */}
        {isBR ? (
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="p-3 bg-white/3 border border-white/8 rounded-xl text-center">
              <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Você paga</div>
              <div className="text-xl font-black text-white">R$ {amountBRL}</div>
            </div>
            <div className="p-3 bg-white/3 border border-white/8 rounded-xl text-center">
              <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Você recebe</div>
              <div className="text-xl font-black text-emerald-400">R$ {amountBRL}</div>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-white/3 border border-white/8 rounded-xl text-center">
            <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Valor</div>
            <div className="text-2xl font-black text-white">{prefix}{amount}</div>
          </div>
        )}

        {error && <p className="text-rose-400 text-xs mb-3">{error}</p>}
        <button onClick={handle} disabled={loading}
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-40">
          {loading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <>💳 Pagar — {prefix}{amount}</>}
        </button>
        <p className="text-center text-[9px] text-white/20 mt-3">
          Processado via Stripe · 3D Secure · Apple Pay disponível no checkout
        </p>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function DepositPage() {
  const { status } = useSession();
  const router     = useRouter();

  const [step,   setStep]   = useState<"amount" | "method">("amount");
  const [amount, setAmount] = useState(100);
  const [modal,  setModal]  = useState<"pix" | "card" | null>(null);
  const [isBR,   setIsBR]   = useState(false);

  useEffect(() => { setIsBR(isBrazilianUser()); }, []);
  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#050509] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050509] text-white">
      {modal === "pix"  && <PixModal  amount={amount} isBR={isBR} onClose={() => setModal(null)} />}
      {modal === "card" && <CardModal amount={amount} isBR={isBR} onClose={() => setModal(null)} />}

      {/* Header */}
      <header className="h-16 bg-[#0a0c14] border-b border-white/5 flex items-center px-6 gap-4 sticky top-0 z-10">
        <button onClick={() => { if (step === "method") setStep("amount"); else router.back(); }}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
            <span className="text-[#080c14] font-black text-[10px]">PB</span>
          </div>
          <span className="font-black text-sm tracking-tight">
            <span className="text-white">Prime</span><span className="text-amber-400"> Broker</span>
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {[1, 2].map(n => {
            const current = step === "amount" ? 1 : 2;
            return (
              <div key={n} className="flex items-center gap-1">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border transition-all ${
                  n === current
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : n < current
                      ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                      : "bg-white/5 border-white/10 text-white/25"
                }`}>{n}</div>
                {n < 2 && <div className="w-8 h-px bg-white/10 mx-0.5" />}
              </div>
            );
          })}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        {step === "amount" && (
          <AmountStep isBR={isBR} onNext={v => { setAmount(v); setStep("method"); }} />
        )}
        {step === "method" && (
          <MethodStep
            amount={amount} isBR={isBR}
            onBack={() => setStep("amount")}
            onPix={() => setModal("pix")}
            onCard={() => setModal("card")}
          />
        )}
      </div>
    </div>
  );
}
