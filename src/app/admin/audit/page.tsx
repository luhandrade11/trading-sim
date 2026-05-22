"use client";

import { useEffect, useState } from "react";

interface AuditEntry {
  id: string;
  actor: string;
  actorType: string;
  action: string;
  target: string | null;
  meta: string | null;
  ip: string | null;
  createdAt: string;
}

const ACTOR_COLORS: Record<string, string> = {
  admin:     "bg-violet-500/15 text-violet-400 border-violet-500/25",
  affiliate: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  user:      "bg-sky-500/15 text-sky-400 border-sky-500/25",
};

const ACTION_ICONS: Record<string, string> = {
  user_updated:                    "✏️",
  settings_updated:                "⚙️",
  affiliate_approved:              "✅",
  affiliate_rejected:              "❌",
  affiliate_withdrawal_approved:   "💸",
  affiliate_withdrawal_rejected:   "🚫",
  ticket_reply:                    "💬",
};

export default function AuditPage() {
  const [logs, setLogs]         = useState<AuditEntry[]>([]);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [actorType, setActorType] = useState("");
  const [action, setAction]     = useState("");

  async function load(p: number) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (actorType) params.set("actorType", actorType);
    if (action)    params.set("action", action);

    const r = await fetch(`/api/admin/audit?${params}`);
    const d = await r.json();
    setLogs(d.logs ?? []);
    setTotal(d.total ?? 0);
    setPages(d.pages ?? 1);
    setLoading(false);
  }

  useEffect(() => { load(page); }, [page]);

  function search() { setPage(1); load(1); }

  function parseMeta(raw: string | null) {
    if (!raw) return null;
    try { return JSON.stringify(JSON.parse(raw), null, 0); } catch { return raw; }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Log de Auditoria</h1>
        <p className="text-slate-500 text-sm mt-1">{total} eventos registrados</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={actorType}
          onChange={(e) => setActorType(e.target.value)}
          className="bg-[#0d0a1a] border border-[#1e1532] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/40"
        >
          <option value="">Todos os atores</option>
          <option value="admin">Admin</option>
          <option value="affiliate">Afiliado</option>
          <option value="user">Usuário</option>
        </select>
        <input
          type="text"
          placeholder="Filtrar por ação…"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          className="bg-[#0d0a1a] border border-[#1e1532] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 flex-1 max-w-sm"
        />
        <button
          onClick={search}
          className="bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/15 text-violet-400 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
        >
          Filtrar
        </button>
      </div>

      <div className="bg-[#0d0a1a] border border-[#1e1532] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-[120px_1fr_1fr_1fr_120px] gap-4 px-5 py-3 border-b border-[#1e1532] text-[10px] uppercase tracking-widest text-slate-600">
          <span>Ator</span>
          <span>Ação</span>
          <span>Alvo</span>
          <span>Dados</span>
          <span>Data</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-slate-600 text-sm">Nenhum evento encontrado.</div>
        ) : (
          <div className="divide-y divide-[#1e1532]">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-3.5 grid grid-cols-1 md:grid-cols-[120px_1fr_1fr_1fr_120px] gap-2 md:gap-4 items-start">
                <div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ACTOR_COLORS[log.actorType] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>
                    {log.actorType}
                  </span>
                  <div className="text-[10px] text-slate-600 mt-1 font-mono truncate max-w-[110px]">{log.actor.slice(0, 12)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span>{ACTION_ICONS[log.action] ?? "📋"}</span>
                  <span className="text-sm text-white font-medium">{log.action}</span>
                </div>
                <div className="text-sm text-slate-500 font-mono truncate">{log.target ?? "—"}</div>
                <div className="text-xs text-slate-600 font-mono truncate max-w-[200px]">{parseMeta(log.meta) ?? "—"}</div>
                <div className="text-xs text-slate-600">
                  {new Date(log.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 rounded-xl border border-[#1e1532] text-sm text-slate-400 hover:text-white disabled:opacity-40 transition-colors">
            ← Anterior
          </button>
          <span className="text-sm text-slate-500">{page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
            className="px-4 py-2 rounded-xl border border-[#1e1532] text-sm text-slate-400 hover:text-white disabled:opacity-40 transition-colors">
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}
