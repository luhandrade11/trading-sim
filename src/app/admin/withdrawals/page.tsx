"use client";

import { useEffect, useState, useCallback } from "react";

interface Withdrawal {
  id: string; amount: number; method: string; details: string;
  status: string; createdAt: string;
  user: { id: string; name: string; email: string; realBalance: number };
}

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [pages,       setPages]       = useState(1);
  const [filter,      setFilter]      = useState("PENDING");
  const [loading,     setLoading]     = useState(true);
  const [acting,      setActing]      = useState<string | null>(null);

  const fetchWithdrawals = useCallback(async (status = filter, p = page) => {
    setLoading(true);
    const res = await fetch(`/api/admin/withdrawals?status=${status}&page=${p}`);
    if (res.ok) {
      const d = await res.json();
      setWithdrawals(d.withdrawals); setTotal(d.total); setPages(d.pages);
    }
    setLoading(false);
  }, [filter, page]);

  useEffect(() => { fetchWithdrawals(); }, [fetchWithdrawals]);

  async function handleAction(id: string, action: "APPROVE" | "REJECT") {
    setActing(id);
    const res = await fetch(`/api/admin/withdrawals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "Erro ao processar");
    }
    setActing(null);
    fetchWithdrawals();
  }

  function changeFilter(f: string) {
    setFilter(f); setPage(1); fetchWithdrawals(f, 1);
  }

  const statusColor: Record<string, string> = {
    PENDING:  "bg-amber-500/20 text-amber-400",
    APPROVED: "bg-emerald-500/20 text-emerald-400",
    REJECTED: "bg-rose-500/20 text-rose-400",
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-white">Saques</h1>
          <p className="text-slate-500 text-sm mt-1">{total} solicitações</p>
        </div>
        <div className="flex gap-2">
          {["PENDING", "APPROVED", "REJECTED", "ALL"].map((f) => (
            <button key={f} onClick={() => changeFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f
                  ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                  : "bg-[#0c0918] border border-white/6 text-slate-500 hover:text-slate-300"
              }`}>
              {f === "PENDING" ? "Pendentes" : f === "APPROVED" ? "Aprovados" : f === "REJECTED" ? "Rejeitados" : "Todos"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#0c0918] border border-white/6 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/6">
              {["Usuário", "Valor", "Método", "Chave/Destino", "Status", "Data", "Ações"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-slate-500 text-xs uppercase font-semibold tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-500">Carregando…</td></tr>
            ) : withdrawals.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-500">Nenhum saque encontrado</td></tr>
            ) : withdrawals.map((w) => (
              <tr key={w.id} className="border-b border-white/6/50 hover:bg-white/2 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-white font-semibold">{w.user.name}</p>
                  <p className="text-slate-500 text-xs">{w.user.email}</p>
                  <p className="text-slate-600 text-xs">Saldo: {fmt(w.user.realBalance)}</p>
                </td>
                <td className="px-4 py-3 font-mono font-bold text-violet-400">{fmt(w.amount)}</td>
                <td className="px-4 py-3 text-slate-300 capitalize">{w.method.toLowerCase()}</td>
                <td className="px-4 py-3">
                  <p className="text-slate-300 text-xs max-w-[180px] break-all">{w.details}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor[w.status] ?? "text-slate-400"}`}>
                    {w.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {new Date(w.createdAt).toLocaleDateString("pt-BR")}<br />
                  {new Date(w.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3">
                  {w.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(w.id, "APPROVE")}
                        disabled={acting === w.id}
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold disabled:opacity-40 transition-all"
                      >
                        {acting === w.id ? "…" : "Aprovar"}
                      </button>
                      <button
                        onClick={() => handleAction(w.id, "REJECT")}
                        disabled={acting === w.id}
                        className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg text-xs font-bold disabled:opacity-40 transition-all"
                      >
                        {acting === w.id ? "…" : "Rejeitar"}
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-600 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 bg-[#0c0918] border border-white/6 text-slate-400 rounded-lg text-sm disabled:opacity-40">←</button>
          <span className="text-slate-400 text-sm">{page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
            className="px-3 py-1.5 bg-[#0c0918] border border-white/6 text-slate-400 rounded-lg text-sm disabled:opacity-40">→</button>
        </div>
      )}
    </div>
  );
}
