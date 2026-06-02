"use client";

import { useEffect, useState } from "react";

interface Revenue {
  id: string;
  userId: string;
  tradeId: string;
  amount: number;
  createdAt: string;
  playerName: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function AfiliadosRevenuesPage() {
  const [rows, setRows]   = useState<Revenue[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalEarned, setTotalEarned] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/afiliados/revenues?page=${page}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.rows ?? []);
        setTotal(d.total ?? 0);
        // totalEarned comes from the API total field across all pages, not just this page
        if (d.totalAmount !== undefined) setTotalEarned(d.totalAmount);
        else if (page === 1 && d.rows?.length) {
          // fallback: sum current page only
          const sum = d.rows.reduce((acc: number, r: Revenue) => acc + r.amount, 0);
          setTotalEarned(sum);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const pages = Math.ceil(total / 30);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Histórico de receitas</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {total} operação{total !== 1 ? "ões" : ""} registrada{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Total ganho</div>
          <div className="text-lg font-black text-emerald-400">{fmt(totalEarned)}</div>
        </div>
      </div>

      <div className="bg-[#0d1117] border border-white/6 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/6 flex items-center justify-between">
          <h2 className="font-bold text-white">Receitas por operação</h2>
          <span className="text-xs text-slate-500">90% das perdas dos jogadores</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-25" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
            <p className="text-sm">Nenhuma receita ainda.</p>
            <p className="text-xs text-slate-600 mt-1">Suas receitas aparecem aqui quando seus jogadores operarem com dinheiro real.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-[1fr_180px_120px_100px] gap-4 px-6 py-3 text-[10px] uppercase tracking-widest text-slate-600 border-b border-white/6">
              <span>Jogador</span>
              <span>Data/Hora</span>
              <span className="font-mono">Trade ID</span>
              <span className="text-right">Receita</span>
            </div>

            <div className="divide-y divide-white/5">
              {rows.map((r) => (
                <div key={r.id} className="px-6 py-4">
                  {/* Mobile */}
                  <div className="md:hidden flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">{r.playerName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {new Date(r.createdAt).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <div className="text-sm font-black text-emerald-400">+{fmt(r.amount)}</div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden md:grid grid-cols-[1fr_180px_120px_100px] gap-4 items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 bg-emerald-400/10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-emerald-400">
                        {r.playerName[0]}
                      </div>
                      <span className="text-sm text-white truncate">{r.playerName}</span>
                    </div>
                    <div className="text-sm text-slate-400">
                      {new Date(r.createdAt).toLocaleString("pt-BR")}
                    </div>
                    <div className="text-xs font-mono text-slate-600 truncate">{r.tradeId.slice(-8)}</div>
                    <div className="text-sm font-black text-emerald-400 text-right">+{fmt(r.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl border border-white/6 text-sm text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-sm text-slate-500">{page} / {pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-4 py-2 rounded-xl border border-white/6 text-sm text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}
