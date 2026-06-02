"use client";

import { useEffect, useState } from "react";

interface TicketMsg {
  id: string;
  authorType: string;
  authorId: string;
  body: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  authorType: string;
  authorId: string;
  author?: { id: string; name: string; email: string } | null;
  messages: TicketMsg[];
  _count: { messages: number };
  createdAt: string;
  updatedAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  OPEN:        "bg-sky-500/15 text-sky-400 border-sky-500/25",
  IN_PROGRESS: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  CLOSED:      "bg-slate-500/15 text-slate-400 border-slate-500/25",
};

const STATUS_LABELS: Record<string, string> = { OPEN: "Aberto", IN_PROGRESS: "Em andamento", CLOSED: "Fechado" };

const PRIORITY_STYLES: Record<string, string> = {
  LOW:    "bg-slate-500/10 text-slate-500 border-slate-500/20",
  NORMAL: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  HIGH:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  URGENT: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export default function AdminTicketsPage() {
  const [tickets, setTickets]   = useState<Ticket[]>([]);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatus] = useState("");
  const [active, setActive]     = useState<Ticket | null>(null);
  const [reply, setReply]       = useState("");
  const [sending, setSending]   = useState(false);
  const [newStatus, setNewStatus] = useState("");

  async function load(p: number) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (statusFilter) params.set("status", statusFilter);
    const r = await fetch(`/api/admin/tickets?${params}`);
    const d = await r.json();
    setTickets(d.tickets ?? []);
    setTotal(d.total ?? 0);
    setPages(d.pages ?? 1);
    setLoading(false);
  }

  async function loadTicket(id: string) {
    const r = await fetch(`/api/admin/tickets/${id}`);
    const d = await r.json();
    setActive(d);
    setNewStatus(d.status);
  }

  useEffect(() => { load(page); }, [page, statusFilter]);

  async function sendReply() {
    if (!active || (!reply.trim() && newStatus === active.status)) return;
    setSending(true);
    const body: Record<string, string> = {};
    if (reply.trim()) body.message = reply.trim();
    if (newStatus !== active.status) body.status = newStatus;

    await fetch(`/api/admin/tickets/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setReply("");
    await loadTicket(active.id);
    load(page);
    setSending(false);
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-xl font-black text-white">Tickets de Suporte</h1>
        <p className="text-slate-500 text-sm mt-1">{total} tickets no total</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        {/* List */}
        <div>
          {/* Filters */}
          <div className="flex gap-2 mb-4">
            {["", "OPEN", "IN_PROGRESS", "CLOSED"].map((s) => (
              <button key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  statusFilter === s
                    ? "bg-violet-500/15 text-violet-400 border-violet-500/30"
                    : "bg-transparent text-slate-500 border-white/6 hover:text-slate-300"
                }`}
              >
                {s === "" ? "Todos" : STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          <div className="bg-[#0c0918] border border-white/6 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 border-2 border-violet-400/20 border-t-violet-400 rounded-full animate-spin" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-16 text-slate-600 text-sm">Nenhum ticket.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => loadTicket(t.id)}
                    className={`w-full px-5 py-4 text-left hover:bg-white/2 transition-colors ${active?.id === t.id ? "bg-violet-500/5 border-l-2 border-violet-500" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_STYLES[t.status] ?? ""}`}>
                            {STATUS_LABELS[t.status] ?? t.status}
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${PRIORITY_STYLES[t.priority] ?? ""}`}>
                            {t.priority}
                          </span>
                          <span className="text-[10px] text-slate-600 uppercase">{t.authorType}</span>
                        </div>
                        <div className="text-sm font-semibold text-white truncate">{t.subject}</div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">{t.author?.name} · {t.author?.email}</div>
                      </div>
                      <div className="text-[10px] text-slate-600 shrink-0">
                        {new Date(t.updatedAt).toLocaleDateString("pt-BR")}
                        <div className="text-right">{t._count.messages} msg</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-xl border border-white/6 text-xs text-slate-400 hover:text-white disabled:opacity-40">← Anterior</button>
              <span className="text-xs text-slate-500">{page}/{pages}</span>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                className="px-3 py-1.5 rounded-xl border border-white/6 text-xs text-slate-400 hover:text-white disabled:opacity-40">Próxima →</button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {active ? (
          <div className="bg-[#0c0918] border border-white/6 rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-200px)]">
            <div className="px-5 py-4 border-b border-white/6">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_STYLES[active.status] ?? ""}`}>
                  {STATUS_LABELS[active.status]}
                </span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${PRIORITY_STYLES[active.priority] ?? ""}`}>
                  {active.priority}
                </span>
              </div>
              <h3 className="font-bold text-white text-sm">{active.subject}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{active.author?.name} ({active.authorType}) · {active.author?.email}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {active.messages?.map((m) => (
                <div key={m.id} className={`flex ${m.authorType === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    m.authorType === "admin"
                      ? "bg-violet-500/15 text-violet-100 rounded-br-sm"
                      : "bg-[#161228] border border-white/6 text-slate-300 rounded-bl-sm"
                  }`}>
                    <div className="text-[10px] mb-1 opacity-60">
                      {m.authorType === "admin" ? "Admin" : active.author?.name}
                      {" · "}{new Date(m.createdAt).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {m.body}
                  </div>
                </div>
              ))}
            </div>

            {/* Reply box */}
            {active.status !== "CLOSED" ? (
              <div className="p-4 border-t border-white/6 space-y-3">
                <div className="flex gap-2">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="bg-[#070510] border border-white/6 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="OPEN">Aberto</option>
                    <option value="IN_PROGRESS">Em andamento</option>
                    <option value="CLOSED">Fechar</option>
                  </select>
                </div>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Resposta do admin…"
                  rows={3}
                  className="w-full bg-[#070510] border border-white/6 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 resize-none"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || (!reply.trim() && newStatus === active.status)}
                  className="w-full bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/15 text-violet-400 rounded-xl py-2 text-sm font-medium transition-colors disabled:opacity-40"
                >
                  {sending ? "Enviando…" : "Enviar Resposta"}
                </button>
              </div>
            ) : (
              <div className="px-5 py-4 border-t border-white/6 text-center text-sm text-slate-600">
                Ticket fechado.{" "}
                <button onClick={() => {
                  setNewStatus("OPEN");
                  fetch(`/api/admin/tickets/${active.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "OPEN" }),
                  }).then(() => { loadTicket(active.id); load(page); });
                }} className="text-violet-400 hover:underline">Reabrir</button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#0c0918] border border-white/6 rounded-2xl flex items-center justify-center h-64">
            <p className="text-slate-600 text-sm">Selecione um ticket para responder.</p>
          </div>
        )}
      </div>
    </div>
  );
}
