"use client";

import { useEffect, useState } from "react";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

interface TicketMsg {
  id: string;
  authorType: string;
  body: string;
  createdAt: string;
}

interface FullTicket extends Ticket {
  messages: TicketMsg[];
}

const STATUS_LABELS: Record<string, string> = { OPEN: "Aberto", IN_PROGRESS: "Em andamento", CLOSED: "Fechado" };
const STATUS_STYLES: Record<string, string> = {
  OPEN:        "bg-sky-500/10 text-sky-400 border-sky-500/20",
  IN_PROGRESS: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  CLOSED:      "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default function AfiliadoSuportePage() {
  const [tickets, setTickets]   = useState<Ticket[]>([]);
  const [active, setActive]     = useState<FullTicket | null>(null);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState<"list" | "new" | "detail">("list");

  const [subject, setSubject]   = useState("");
  const [message, setMessage]   = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [submitting, setSubmitting] = useState(false);
  const [reply, setReply]       = useState("");
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState("");

  async function load() {
    const r = await fetch("/api/tickets");
    const d = await r.json();
    setTickets(Array.isArray(d) ? d : []);
    setLoading(false);
  }

  async function openTicket(id: string) {
    const r = await fetch(`/api/tickets/${id}`);
    const d = await r.json();
    setActive(d);
    setView("detail");
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError("");
    const r = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message, priority }),
    });
    const d = await r.json();
    if (!r.ok) { setError(d.error ?? "Erro"); setSubmitting(false); return; }
    setSubject(""); setMessage(""); setPriority("NORMAL");
    await load();
    setView("list");
    setSubmitting(false);
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !reply.trim()) return;
    setSending(true);
    await fetch(`/api/tickets/${active.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: reply }),
    });
    setReply("");
    await openTicket(active.id);
    setSending(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Suporte</h1>
          <p className="text-slate-500 text-sm mt-0.5">Abra um ticket para nossa equipe</p>
        </div>
        {view !== "new" && (
          <button onClick={() => setView("new")}
            className="bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 text-emerald-400 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            + Novo Ticket
          </button>
        )}
      </div>

      {/* New ticket form */}
      {view === "new" && (
        <div className="bg-[#0d1117] border border-[#1e2a42] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e2a42] flex items-center justify-between">
            <h2 className="font-bold text-white text-sm">Abrir novo ticket</h2>
            <button onClick={() => setView("list")} className="text-slate-500 hover:text-white text-sm">← Voltar</button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-sm">{error}</div>}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Assunto</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={5}
                className="w-full bg-[#080c14] border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-700 focus:outline-none focus:border-emerald-500/40"
                placeholder="Descreva brevemente o problema" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Prioridade</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="bg-[#080c14] border border-white/8 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/40">
                <option value="LOW">Baixa</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Mensagem</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} rows={5}
                className="w-full bg-[#080c14] border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-700 focus:outline-none focus:border-emerald-500/40 resize-none"
                placeholder="Descreva detalhadamente…" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setView("list")}
                className="flex-1 border border-white/8 rounded-xl py-3 text-sm text-slate-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-white font-bold rounded-xl py-3 text-sm disabled:opacity-50">
                {submitting ? "Enviando…" : "Abrir Ticket"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Detail view */}
      {view === "detail" && active && (
        <div className="bg-[#0d1117] border border-[#1e2a42] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e2a42] flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_STYLES[active.status] ?? ""}`}>
                  {STATUS_LABELS[active.status] ?? active.status}
                </span>
              </div>
              <h2 className="font-bold text-white text-sm">{active.subject}</h2>
            </div>
            <button onClick={() => { setView("list"); setActive(null); }} className="text-slate-500 hover:text-white text-sm shrink-0">← Voltar</button>
          </div>

          <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
            {active.messages.map((m) => (
              <div key={m.id} className={`flex ${m.authorType === "admin" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  m.authorType === "admin"
                    ? "bg-[#161228] border border-[#1e1532] text-slate-300 rounded-bl-sm"
                    : "bg-emerald-500/15 text-emerald-100 rounded-br-sm"
                }`}>
                  <div className="text-[10px] mb-1 opacity-60">
                    {m.authorType === "admin" ? "Suporte" : "Você"}
                    {" · "}{new Date(m.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  {m.body}
                </div>
              </div>
            ))}
          </div>

          {active.status !== "CLOSED" ? (
            <form onSubmit={sendReply} className="px-4 pb-4 flex gap-2">
              <input value={reply} onChange={(e) => setReply(e.target.value)} required minLength={2}
                placeholder="Responder…"
                className="flex-1 bg-[#080c14] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500/40"
              />
              <button type="submit" disabled={sending || !reply.trim()}
                className="bg-emerald-500/15 border border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors">
                {sending ? "…" : "Enviar"}
              </button>
            </form>
          ) : (
            <div className="px-5 pb-4 text-center text-xs text-slate-600">Ticket encerrado. Abra um novo ticket se precisar de mais ajuda.</div>
          )}
        </div>
      )}

      {/* Ticket list */}
      {view === "list" && (
        <div className="bg-[#0d1117] border border-[#1e2a42] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e2a42]">
            <h2 className="font-bold text-white text-sm">Meus Tickets</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-14">
              <div className="text-4xl mb-3">🎫</div>
              <p className="text-sm text-slate-600">Nenhum ticket ainda.</p>
              <p className="text-xs text-slate-700 mt-1">Clique em "Novo Ticket" para entrar em contato.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1e2a42]">
              {tickets.map((t) => (
                <button key={t.id} onClick={() => openTicket(t.id)}
                  className="w-full px-5 py-4 text-left hover:bg-white/1 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_STYLES[t.status] ?? ""}`}>
                          {STATUS_LABELS[t.status] ?? t.status}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-white truncate">{t.subject}</div>
                      <div className="text-xs text-slate-600 mt-0.5">{t._count.messages} mensagens</div>
                    </div>
                    <div className="text-xs text-slate-600 shrink-0">
                      {new Date(t.updatedAt).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
