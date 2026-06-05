"use client";

import { useEffect, useState, useCallback } from "react";

interface User {
  id: string; name: string; email: string;
  balance: number; realBalance: number;
  isBlocked: boolean; winRateOverride: number | null; adminNote: string | null;
  createdAt: string; _count: { trades: number };
}

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function EditModal({ user, onClose, onSaved }: {
  user: User; onClose: () => void; onSaved: () => void;
}) {
  const [winRate,      setWinRate]      = useState(user.winRateOverride !== null ? String(user.winRateOverride) : "");
  const [balance,      setBalance]      = useState(String(user.balance));
  const [realBalance,  setRealBalance]  = useState(String(user.realBalance));
  const [isBlocked,    setIsBlocked]    = useState(user.isBlocked);
  const [adminNote,    setAdminNote]    = useState(user.adminNote ?? "");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  async function save() {
    setLoading(true); setError("");

    const body: Record<string, unknown> = {
      isBlocked,
      adminNote,
      balance:     Number(balance),
      realBalance: Number(realBalance),
    };

    if (winRate === "") {
      body.winRateOverride = null;
    } else {
      const n = Number(winRate);
      if (isNaN(n) || n < 0 || n > 100) {
        setError("Win rate deve ser entre 0 e 100");
        setLoading(false); return;
      }
      body.winRateOverride = n;
    }

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      onSaved(); onClose();
    } else {
      const d = await res.json();
      setError(d.error ?? "Erro ao salvar");
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0c0918] border border-white/6 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-white font-bold text-lg mb-1">{user.name}</h2>
        <p className="text-slate-500 text-sm mb-5">{user.email}</p>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-sm mb-4">{error}</div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Saldo Demo</label>
              <input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} min="0" step="0.01"
                className="mt-1 w-full bg-[#070510] border border-white/6 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50" />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Saldo Real</label>
              <input type="number" value={realBalance} onChange={(e) => setRealBalance(e.target.value)} min="0" step="0.01"
                className="mt-1 w-full bg-[#070510] border border-white/6 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50" />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase font-semibold tracking-wide">
              Win Rate Override (0–100%) — vazio = usar padrão
            </label>
            <input type="number" value={winRate} onChange={(e) => setWinRate(e.target.value)} min="0" max="100"
              placeholder="Ex: 100 = influencer sempre ganha"
              className="mt-1 w-full bg-[#070510] border border-white/6 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder-slate-700" />
            <p className="text-slate-600 text-xs mt-1">100 = sempre ganha · 0 = sempre perde · vazio = taxa padrão da casa</p>
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Nota Interna</label>
            <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2} maxLength={500}
              placeholder="Influencer, suspeito, etc."
              className="mt-1 w-full bg-[#070510] border border-white/6 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder-slate-700 resize-none" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setIsBlocked((b) => !b)}
              className={`w-11 h-6 rounded-full transition-colors relative ${isBlocked ? "bg-rose-500" : "bg-slate-700"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isBlocked ? "left-5.5" : "left-0.5"}`}
                style={{ left: isBlocked ? "22px" : "2px" }} />
            </div>
            <span className="text-sm text-slate-300">Conta bloqueada</span>
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-white/6 hover:bg-white/8 text-white rounded-xl py-2.5 text-sm font-semibold transition-all">
            Cancelar
          </button>
          <button onClick={save} disabled={loading}
            className="flex-1 bg-gradient-to-r from-violet-500 to-violet-400 disabled:opacity-50 text-white font-bold rounded-xl py-2.5 text-sm transition-all">
            {loading ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [users,   setUsers]   = useState<User[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<User | null>(null);

  const fetchUsers = useCallback(async (q = search, p = page) => {
    setLoading(true);
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}&page=${p}`);
    if (res.ok) {
      const d = await res.json();
      setUsers(d.users); setTotal(d.total); setPages(d.pages);
    }
    setLoading(false);
  }, [search, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function doSearch(q: string) {
    setSearch(q); setPage(1); fetchUsers(q, 1);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-black text-white">Usuários</h1>
          <p className="text-slate-500 text-sm mt-1">{total} usuários cadastrados</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => doSearch(e.target.value)}
          placeholder="Buscar por nome ou email…"
          className="bg-[#0c0918] border border-white/6 rounded-xl px-4 py-2.5 text-white text-sm w-full sm:w-64 focus:outline-none focus:border-violet-500/50 placeholder-slate-700"
        />
      </div>

      <div className="bg-[#0c0918] border border-white/6 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-white/6">
              {["Usuário", "Demo", "Real", "Trades", "Win Rate", "Status", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-slate-500 text-xs uppercase font-semibold tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-500">Carregando…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-500">Nenhum usuário encontrado</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="border-b border-white/6/50 hover:bg-white/2 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-white font-semibold">{u.name}</p>
                  <p className="text-slate-500 text-xs">{u.email}</p>
                </td>
                <td className="px-4 py-3 font-mono text-slate-300">{fmt(u.balance)}</td>
                <td className="px-4 py-3 font-mono">
                  <span className={u.realBalance > 0 ? "text-violet-400" : "text-slate-500"}>{fmt(u.realBalance)}</span>
                </td>
                <td className="px-4 py-3 text-slate-400">{u._count.trades}</td>
                <td className="px-4 py-3">
                  {u.winRateOverride !== null ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      u.winRateOverride >= 80 ? "bg-emerald-500/20 text-emerald-400" :
                      u.winRateOverride <= 20 ? "bg-rose-500/20 text-rose-400" :
                      "bg-violet-500/20 text-violet-400"
                    }`}>
                      {u.winRateOverride}%
                    </span>
                  ) : (
                    <span className="text-slate-600 text-xs">Padrão</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.isBlocked ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400">Bloqueado</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">Ativo</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setEditing(u)}
                    className="text-violet-400 hover:text-violet-300 text-xs font-semibold transition-colors">
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 bg-[#0c0918] border border-white/6 text-slate-400 rounded-lg text-sm disabled:opacity-40">←</button>
          <span className="text-slate-400 text-sm">{page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
            className="px-3 py-1.5 bg-[#0c0918] border border-white/6 text-slate-400 rounded-lg text-sm disabled:opacity-40">→</button>
        </div>
      )}

      {editing && (
        <EditModal user={editing} onClose={() => setEditing(null)} onSaved={() => fetchUsers()} />
      )}
    </div>
  );
}
