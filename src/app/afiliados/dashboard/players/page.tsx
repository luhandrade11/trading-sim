"use client";

import { useEffect, useState } from "react";

interface Player {
  id: string;
  name: string;
  email: string;
  affiliateLinkSlug: string | null;
  createdAt: string;
  earned: number;
  trades: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function AfiliadosPlayersPage() {
  const [rows, setRows] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/afiliados/players?page=${page}`)
      .then((r) => r.json())
      .then((d) => { setRows(d.rows ?? []); setTotal(d.total ?? 0); setLoading(false); });
  }, [page]);

  const pages = Math.ceil(total / 20);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Jogadores</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {total} trader{total !== 1 ? "s" : ""} indicado{total !== 1 ? "s" : ""} por você
        </p>
      </div>

      <div className="bg-[#0d1117] border border-white/6 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/6">
          <h2 className="font-bold text-white">Todos os jogadores</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-25" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <p className="text-sm">Nenhum jogador indicado ainda.</p>
            <p className="text-xs text-slate-600 mt-1">Compartilhe seu link de divulgação para começar.</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[1fr_1fr_100px_80px_100px] gap-4 px-6 py-3 text-[10px] uppercase tracking-widest text-slate-600 border-b border-white/6">
              <span>Nome</span>
              <span>Email</span>
              <span>Link origem</span>
              <span className="text-right">Trades</span>
              <span className="text-right">Gerado</span>
            </div>

            <div className="divide-y divide-white/5">
              {rows.map((p) => (
                <div key={p.id} className="px-6 py-4">
                  {/* Mobile */}
                  <div className="md:hidden flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white text-sm">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.email}</div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {p.trades} trade{p.trades !== 1 ? "s" : ""}
                        {p.affiliateLinkSlug && <> · link <span className="font-mono text-emerald-400/70">{p.affiliateLinkSlug}</span></>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-400">{fmt(p.earned)}</div>
                      <div className="text-[10px] text-slate-600">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</div>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden md:grid grid-cols-[1fr_1fr_100px_80px_100px] gap-4 items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-emerald-400">
                        {p.name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{p.name}</div>
                        <div className="text-xs text-slate-500">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</div>
                      </div>
                    </div>
                    <div className="text-sm text-slate-400 truncate">{p.email}</div>
                    <div className="text-xs font-mono text-emerald-400/70">{p.affiliateLinkSlug ?? "—"}</div>
                    <div className="text-sm text-white text-right font-bold">{p.trades}</div>
                    <div className="text-sm font-bold text-emerald-400 text-right">{fmt(p.earned)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl border border-white/6 text-sm text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-sm text-slate-500">
            {page} / {pages}
          </span>
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
