"use client";

import { useEffect, useState } from "react";

interface SubAfiliado {
  id: string; name: string; email: string;
  commissionRate: number; balance: number; totalEarned: number; createdAt: string;
  status: string;
  _count: { referredUsers: number; subAffiliates: number; revenues: number };
}
interface AffNode {
  id: string; name: string; email: string;
  commissionRate: number; players: number; subAffiliates: AffNode[];
}
interface Me { id: string; commissionRate: number; level: number; }
interface PendingAffiliate {
  id: string; name: string; email: string;
  commissionRate: number; level: number; createdAt: string; phone: string | null;
}

function fmt(n: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n); }

function NetworkNode({ node, depth }: { node: AffNode; depth: number }) {
  const [open, setOpen] = useState(depth === 0);
  const has = node.subAffiliates.length > 0;
  return (
    <div className={`rounded-xl border ${depth === 0 ? "border-emerald-500/20 bg-emerald-500/4" : depth === 1 ? "border-violet-500/15 bg-violet-500/3" : "border-white/5 bg-white/2"} overflow-hidden`}>
      <div className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer" onClick={() => has && setOpen(!open)}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 bg-white/6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-400">
            {node.name[0]}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">{node.name}</div>
            <div className="text-xs text-slate-600">{node.players} jogadores · {Math.round(node.commissionRate * 100)}% RS</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {has && <span className="text-[10px] text-slate-600 bg-white/5 px-2 py-0.5 rounded-full">{node.subAffiliates.length} sub</span>}
          {has && <span className="text-slate-600 text-xs">{open ? "▲" : "▼"}</span>}
        </div>
      </div>
      {open && has && (
        <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
          {node.subAffiliates.map((child) => (
            <NetworkNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AfiliadosRedePage() {
  const [subs, setSubs]   = useState<SubAfiliado[]>([]);
  const [me, setMe]       = useState<Me | null>(null);
  const [tree, setTree]   = useState<AffNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId]   = useState<string | null>(null);
  const [editRate, setEditRate] = useState("");
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState("");
  const [pending, setPending] = useState<PendingAffiliate[]>([]);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveRate, setApproveRate] = useState("90");
  const [approving, setApproving] = useState(false);
  const [blockingId, setBlockingId] = useState<string | null>(null);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function load() {
    try {
      const [meRes, subsRes, netRes, pendingRes] = await Promise.all([
        fetch("/api/afiliados/me").then((r) => r.json()),
        fetch("/api/afiliados/subafiliados").then((r) => r.json()),
        fetch("/api/afiliados/network").then((r) => r.json()),
        fetch("/api/afiliados/pending").then((r) => r.json()),
      ]);
      setMe(meRes);
      setSubs(Array.isArray(subsRes) ? subsRes : []);
      setTree(netRes.tree ?? []);
      setPending(Array.isArray(pendingRes) ? pendingRes : []);
    } catch {
      // Keep previous state on network error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSaveRate(subId: string) {
    setSaving(true); setSaveError("");
    const r = await fetch(`/api/afiliados/subafiliados/${subId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commissionRate: Number(editRate) }),
    });
    const d = await r.json();
    if (!r.ok) { setSaveError(d.error || "Erro"); setSaving(false); return; }
    setEditId(null);
    setSaving(false);
    load();
  }

  async function handleApprove(subId: string, action: "approve" | "reject") {
    setApproving(true);
    const r = await fetch("/api/afiliados/pending", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: subId, action, commissionRate: action === "approve" ? Number(approveRate) : undefined }),
    });
    if (r.ok) { setApproveId(null); load(); }
    setApproving(false);
  }

  async function handleBlock(subId: string, currentStatus: string) {
    setBlockingId(subId);
    const action = currentStatus === "BLOCKED" ? "unblock" : "block";
    await fetch(`/api/afiliados/subafiliados/${subId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBlockingId(null);
    load();
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" /></div>;
  }

  const myRate = me ? Math.round(me.commissionRate * 100) : 90;
  const canRecruit = me && me.level < 4;
  const recruitLink = me ? `${baseUrl}/afiliados/register?ref=${me.id}` : "";
  const activeSubs = subs.filter((s) => s.status !== "PENDING");

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Minha rede</h1>
        <p className="text-slate-500 text-sm mt-0.5">{activeSubs.length} afiliado{activeSubs.length !== 1 ? "s" : ""} direto{activeSubs.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Aprovações pendentes */}
      {pending.length > 0 && (
        <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-500/15 flex items-center gap-3">
            <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" d="M12 6v6l4 2" />
            </svg>
            <span className="font-bold text-amber-400 text-sm">Aprovações pendentes</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">{pending.length}</span>
          </div>
          <div className="divide-y divide-amber-500/10">
            {pending.map((p) => {
              const isExpanded = approveId === p.id;
              const date = new Date(p.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
              return (
                <div key={p.id} className="px-5 py-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-8 h-8 bg-amber-500/10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-amber-300 border border-amber-500/20">
                      {p.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white text-sm">{p.name}</div>
                      <div className="text-xs text-slate-500 truncate">{p.email} · {date}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      {isExpanded ? (
                        <>
                          <div className="flex items-center gap-1 bg-[#080c14] border border-white/10 rounded-xl px-2 py-1">
                            <input
                              type="number"
                              value={approveRate}
                              onChange={(e) => setApproveRate(e.target.value)}
                              min={1} max={myRate} step={1}
                              className="w-12 bg-transparent text-white text-sm font-bold text-right focus:outline-none"
                              autoFocus
                            />
                            <span className="text-slate-500 text-sm">%</span>
                          </div>
                          <button
                            onClick={() => handleApprove(p.id, "approve")}
                            disabled={approving}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#080c14] font-bold text-xs px-3 py-1.5 rounded-xl transition-all"
                          >
                            {approving ? "···" : "Aprovar"}
                          </button>
                          <button
                            onClick={() => handleApprove(p.id, "reject")}
                            disabled={approving}
                            className="bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-50 text-rose-400 font-bold text-xs px-3 py-1.5 rounded-xl transition-all border border-rose-500/20"
                          >
                            Rejeitar
                          </button>
                          <button
                            onClick={() => setApproveId(null)}
                            className="text-slate-600 hover:text-slate-300 text-xs px-2 py-1.5 transition-colors"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1 bg-[#080c14] border border-white/10 rounded-xl px-2 py-1">
                            <input
                              type="number"
                              value={approveRate}
                              onChange={(e) => setApproveRate(e.target.value)}
                              min={1} max={myRate} step={1}
                              className="w-12 bg-transparent text-white text-sm font-bold text-right focus:outline-none"
                            />
                            <span className="text-slate-500 text-sm">%</span>
                          </div>
                          <button
                            onClick={() => { setApproveId(p.id); handleApprove(p.id, "approve"); }}
                            disabled={approving}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#080c14] font-bold text-xs px-3 py-1.5 rounded-xl transition-all"
                          >
                            {approving ? "···" : "Aprovar"}
                          </button>
                          <button
                            onClick={() => handleApprove(p.id, "reject")}
                            disabled={approving}
                            className="bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-50 text-rose-400 font-bold text-xs px-3 py-1.5 rounded-xl transition-all border border-rose-500/20"
                          >
                            Rejeitar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Link de recrutamento */}
      {canRecruit && (
        <div className="bg-gradient-to-r from-violet-500/10 to-violet-600/5 border border-violet-500/20 rounded-2xl p-5">
          <div className="font-semibold text-violet-400 text-sm mb-2">Link para recrutar afiliados</div>
          <p className="text-slate-400 text-xs mb-3">Compartilhe para trazer novos afiliados para sua rede. Você controla a comissão deles.</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-violet-300/70 bg-violet-500/8 border border-violet-500/15 px-3 py-2 rounded-xl truncate flex-1">{recruitLink}</span>
            <button onClick={() => { navigator.clipboard.writeText(recruitLink); }}
              className="bg-violet-500 hover:bg-violet-400 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex-shrink-0 active:scale-95">
              Copiar
            </button>
          </div>
        </div>
      )}

      {/* Seus sub-afiliados diretos */}
      <div className="bg-[#0d1117] border border-white/6 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-sm">Seus afiliados diretos</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Você pode ajustar a comissão de cada um — o spread vem para você</p>
          </div>
          <div className="text-[10px] text-slate-600 bg-white/4 px-3 py-1.5 rounded-lg border border-white/6">
            Sua taxa: <span className="text-emerald-400 font-bold">{myRate}%</span>
          </div>
        </div>

        {activeSubs.length === 0 ? (
          <div className="text-center py-14 text-slate-600">
            <div className="text-4xl mb-3">🌐</div>
            <p className="text-sm">Nenhum afiliado recrutado ainda.</p>
            {canRecruit && <p className="text-xs mt-1">Compartilhe seu link de recrutamento acima.</p>}
          </div>
        ) : (
          <div className="divide-y divide-white/4">
            {activeSubs.map((sub) => {
              const subRate = Math.round(sub.commissionRate * 100);
              const spread  = myRate - subRate;
              const isEditing = editId === sub.id;
              const isBlocking = blockingId === sub.id;
              return (
                <div key={sub.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-gradient-to-br from-white/8 to-white/4 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-slate-300 border border-white/8">
                        {sub.name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold text-white text-sm">{sub.name}</div>
                          {sub.status === "BLOCKED" && (
                            <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full">Bloqueado</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{sub.email}</div>
                        <div className="text-[10px] text-slate-600 mt-0.5">
                          {sub._count.referredUsers} jogadores · {sub._count.subAffiliates} sub-afiliados
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-[#080c14] border border-white/10 rounded-xl px-2 py-1">
                            <input
                              type="number"
                              value={editRate}
                              onChange={(e) => setEditRate(e.target.value)}
                              min={0} max={myRate} step={1}
                              className="w-12 bg-transparent text-white text-sm font-bold text-right focus:outline-none"
                              autoFocus
                            />
                            <span className="text-slate-500 text-sm">%</span>
                          </div>
                          <button onClick={() => handleSaveRate(sub.id)} disabled={saving}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#080c14] font-bold text-xs px-3 py-1.5 rounded-xl transition-all">
                            {saving ? "···" : "OK"}
                          </button>
                          <button onClick={() => { setEditId(null); setSaveError(""); }}
                            className="text-slate-600 hover:text-slate-300 text-xs px-2 py-1.5 transition-colors">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-sm font-black text-white">{subRate}%</div>
                            {spread > 0 && (
                              <div className="text-[10px] text-emerald-400">+{spread}% pra você</div>
                            )}
                          </div>
                          <button
                            onClick={() => { setEditId(sub.id); setEditRate(String(subRate)); setSaveError(""); }}
                            className="text-[10px] text-slate-500 hover:text-emerald-400 border border-white/8 hover:border-emerald-500/30 px-2.5 py-1.5 rounded-lg transition-all"
                          >
                            Editar
                          </button>
                        </div>
                      )}
                      {isEditing && saveError && (
                        <div className="text-[10px] text-rose-400">{saveError}</div>
                      )}
                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-400">{fmt(sub.totalEarned)}</div>
                        <div className="text-[9px] text-slate-600">ganho total</div>
                      </div>
                      {(sub.status === "ACTIVE" || sub.status === "BLOCKED") && !isEditing && (
                        <button
                          onClick={() => handleBlock(sub.id, sub.status)}
                          disabled={isBlocking}
                          className={`text-[10px] border border-white/8 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50 ${
                            sub.status === "BLOCKED"
                              ? "text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/30"
                              : "text-rose-400 hover:text-rose-300 hover:border-rose-500/30"
                          }`}
                        >
                          {isBlocking ? (
                            <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : sub.status === "BLOCKED" ? "Desbloquear" : "Bloquear"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Árvore completa */}
      {tree.length > 0 && (
        <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-5">
          <h2 className="font-bold text-white text-sm mb-1">Toda a sua rede</h2>
          <p className="text-[11px] text-slate-500 mb-5">Clique para expandir cada afiliado e ver sua sub-rede</p>
          <div className="space-y-2">
            {tree.map((node) => <NetworkNode key={node.id} node={node} depth={0} />)}
          </div>
        </div>
      )}

      <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-5">
        <h3 className="font-semibold text-white text-sm mb-3">Como funciona o spread de comissão</h3>
        <div className="space-y-2 text-xs text-slate-400">
          <p>Você define a comissão dos afiliados que recruta. Se seu acordo é <strong className="text-white">{myRate}%</strong> e você define um afiliado em <strong className="text-white">{Math.max(0, myRate - 10)}%</strong>, os <strong className="text-emerald-400">10%</strong> de diferença vêm direto para você a cada perda dos jogadores dele.</p>
          <p className="text-slate-600">A comissão de um afiliado nunca pode ser maior que a sua própria taxa.</p>
        </div>
      </div>
    </div>
  );
}
