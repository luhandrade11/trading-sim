"use client";

import { useEffect, useState, useCallback } from "react";

interface Affiliate {
  id: string;
  name: string;
  email: string;
  commissionRate: number;
  level: number;
  balance: number;
  totalEarned: number;
  parentAffiliateId: string | null;
  createdAt: string;
  status: string;
  _count: { referredUsers: number; subAffiliates: number; revenues: number };
}

interface AffWithdrawal {
  id: string;
  amount: number;
  pixKey: string;
  status: string;
  createdAt: string;
  affiliate: { id: string; name: string; email: string };
}

interface AffDetail {
  id: string;
  name: string;
  email: string;
  commissionRate: number;
  level: number;
  balance: number;
  totalEarned: number;
  pixKey: string | null;
  parentAffiliate: { id: string; name: string; email: string } | null;
  subAffiliates: { id: string; name: string; email: string; level: number; commissionRate: number; _count: { referredUsers: number } }[];
  referredUsers: { id: string; name: string; email: string; realBalance: number; affiliateLinkSlug: string | null; createdAt: string }[];
  _count: { referredUsers: number; subAffiliates: number; revenues: number; withdrawals: number };
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const LEVEL_LABEL = ["", "Nível 1", "Nível 2", "Nível 3", "Nível 4"];
const LEVEL_COLOR = ["", "text-violet-400", "text-sky-400", "text-violet-400", "text-slate-400"];

function StatusBadge({ status }: { status: string }) {
  if (!status || status === "ACTIVE") return null;
  if (status === "PENDING") {
    return (
      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
        Pendente
      </span>
    );
  }
  if (status === "BLOCKED") {
    return (
      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400">
        Bloqueado
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-500/20 text-slate-400">
        Rejeitado
      </span>
    );
  }
  return null;
}

export default function AdminAfiliadosPage() {
  const [tab, setTab] = useState<"list" | "pending" | "withdrawals">("list");
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [q, setQ]                   = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail]         = useState<AffDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Edit modal
  const [editRate, setEditRate]     = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [editLevel, setEditLevel]   = useState("");

  // Fix levels
  const [fixingLevels, setFixingLevels] = useState(false);
  const [fixResult, setFixResult]   = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);

  // Move player modal
  const [moveUserId, setMoveUserId] = useState("");
  const [moveToAffId, setMoveToAffId] = useState("");
  const [moving, setMoving]         = useState(false);

  // Withdrawals tab
  const [withdrawals, setWithdrawals] = useState<AffWithdrawal[]>([]);
  const [wTab, setWTab]             = useState<"PENDING" | "ALL">("PENDING");
  const [loadingW, setLoadingW]     = useState(false);

  // Pending tab
  const [pendingAffs, setPendingAffs] = useState<Affiliate[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [pendingRate, setPendingRate] = useState<Record<string, string>>({});
  const [actioning, setActioning] = useState<string | null>(null);

  const loadList = useCallback(() => {
    setLoadingList(true);
    fetch(`/api/admin/afiliados?page=${page}&q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => { setAffiliates(d.affiliates ?? []); setTotal(d.total ?? 0); setLoadingList(false); });
  }, [page, q]);

  useEffect(() => { loadList(); }, [loadList]);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingDetail(true);
    fetch(`/api/admin/afiliados/${selectedId}`)
      .then((r) => r.json())
      .then((d) => {
        setDetail(d);
        setEditRate(String(Math.round(d.commissionRate * 100)));
        setEditBalance(String(d.balance.toFixed(2)));
        setEditLevel(String(d.level));
        setLoadingDetail(false);
      });
  }, [selectedId]);

  const loadWithdrawals = useCallback(() => {
    setLoadingW(true);
    fetch(`/api/admin/afiliados/withdrawals?status=${wTab}`)
      .then((r) => r.json())
      .then((d) => { setWithdrawals(Array.isArray(d) ? d : []); setLoadingW(false); });
  }, [wTab]);

  useEffect(() => { if (tab === "withdrawals") loadWithdrawals(); }, [tab, loadWithdrawals]);

  const loadPending = useCallback(() => {
    setLoadingPending(true);
    fetch("/api/admin/afiliados?pending=1")
      .then((r) => r.json())
      .then((d) => { setPendingAffs(d.affiliates ?? []); setLoadingPending(false); });
  }, []);

  // Load pending on mount to show badge count
  useEffect(() => { loadPending(); }, [loadPending]);

  useEffect(() => { if (tab === "pending") loadPending(); }, [tab, loadPending]);

  async function handleSave() {
    if (!selectedId) return;
    setSaving(true);
    const rate = Number(editRate) / 100;
    const lvl  = Math.min(4, Math.max(1, Number(editLevel)));
    await fetch(`/api/admin/afiliados/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commissionRate: rate, balance: Number(editBalance), level: lvl }),
    });
    setSaving(false);
    setSelectedId(null);
    loadList();
  }

  async function handleFixLevels() {
    setFixingLevels(true);
    setFixResult(null);
    const r = await fetch("/api/admin/afiliados/fix-levels", { method: "POST" });
    const d = await r.json();
    setFixResult(`✓ ${d.total} afiliados verificados, ${d.fixed} corrigidos`);
    setFixingLevels(false);
    loadList();
  }

  async function handleDelete() {
    if (!selectedId || !confirm("Excluir este afiliado? Todos os jogadores e sub-afiliados serão desvinculados.")) return;
    await fetch(`/api/admin/afiliados/${selectedId}`, { method: "DELETE" });
    setSelectedId(null);
    setDetail(null);
    loadList();
  }

  async function handleMovePlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!moveUserId.trim()) return;
    setMoving(true);
    await fetch("/api/admin/afiliados/move-player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: moveUserId.trim(), newAffiliateId: moveToAffId.trim() || null }),
    });
    setMoving(false);
    setMoveUserId(""); setMoveToAffId("");
    if (selectedId) { setSelectedId(selectedId); } // refresh detail
    alert("Jogador movido com sucesso!");
  }

  async function handleWithdrawalAction(wId: string, action: "APPROVED" | "REJECTED") {
    await fetch(`/api/admin/afiliados/withdrawals/${wId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    loadWithdrawals();
  }

  async function handlePendingAction(affId: string, action: "approve" | "reject") {
    setActioning(affId);
    const rate = pendingRate[affId] !== undefined ? Number(pendingRate[affId]) / 100 : 0.90;
    const body = action === "approve"
      ? { status: "ACTIVE", commissionRate: rate }
      : { status: "REJECTED" };
    await fetch(`/api/admin/afiliados/${affId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setActioning(null);
    loadPending();
  }

  const pages = Math.ceil(total / 20);

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-[#0a0612] text-white">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Afiliados</h1>
            <p className="text-slate-500 text-sm mt-0.5">{total} afiliado{total !== 1 ? "s" : ""} cadastrado{total !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            {fixResult && (
              <span className="text-xs text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-lg">{fixResult}</span>
            )}
            <button
              onClick={handleFixLevels}
              disabled={fixingLevels}
              className="text-xs bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400 font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              title="Recalcula os níveis de todos os afiliados com base na cadeia de parentesco"
            >
              {fixingLevels ? "Corrigindo…" : "🔧 Corrigir níveis"}
            </button>

            {/* Tab: Lista */}
            <button
              onClick={() => setTab("list")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === "list" ? "bg-violet-500/15 text-violet-400 border border-violet-500/20" : "text-slate-400 hover:text-white border border-[#1e1532]"}`}
            >
              Lista
            </button>

            {/* Tab: Pendentes */}
            <button
              onClick={() => setTab("pending")}
              className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === "pending" ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : "text-slate-400 hover:text-white border border-[#1e1532]"}`}
            >
              Pendentes
              {pendingAffs.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center bg-amber-500 text-white text-[10px] font-black rounded-full w-4 h-4 leading-none">
                  {pendingAffs.length}
                </span>
              )}
            </button>

            {/* Tab: Saques PIX */}
            <button
              onClick={() => setTab("withdrawals")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === "withdrawals" ? "bg-violet-500/15 text-violet-400 border border-violet-500/20" : "text-slate-400 hover:text-white border border-[#1e1532]"}`}
            >
              Saques PIX
            </button>
          </div>
        </div>

        {/* LIST TAB */}
        {tab === "list" && (
          <>
            {/* Search */}
            <div className="flex gap-3">
              <input
                type="text"
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Buscar por nome ou email…"
                className="flex-1 bg-[#0d0a1a] border border-[#1e1532] rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500/40"
              />
            </div>

            {/* Table */}
            <div className="bg-[#0d0a1a] border border-[#1e1532] rounded-2xl overflow-hidden">
              <div className="hidden md:grid grid-cols-[1fr_100px_80px_100px_100px_100px_80px] gap-3 px-6 py-3 text-[10px] uppercase tracking-widest text-slate-600 border-b border-[#1e1532]">
                <span>Afiliado</span>
                <span>Nível</span>
                <span>Acordo</span>
                <span className="text-right">Saldo</span>
                <span className="text-right">Total ganho</span>
                <span className="text-right">Jogadores</span>
                <span />
              </div>

              {loadingList ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-5 h-5 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                </div>
              ) : affiliates.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-sm">Nenhum afiliado encontrado.</div>
              ) : (
                <div className="divide-y divide-[#1e1532]">
                  {affiliates.map((a) => (
                    <div
                      key={a.id}
                      className="px-6 py-4 hover:bg-white/2 cursor-pointer transition-colors grid md:grid-cols-[1fr_100px_80px_100px_100px_100px_80px] gap-3 items-center"
                      onClick={() => setSelectedId(a.id)}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-white text-sm truncate">{a.name}</div>
                        <div className="text-xs text-slate-500 truncate">{a.email}</div>
                        <StatusBadge status={a.status} />
                      </div>
                      <div className={`text-xs font-bold ${LEVEL_COLOR[a.level] ?? "text-slate-400"}`}>
                        {LEVEL_LABEL[a.level] ?? `L${a.level}`}
                      </div>
                      <div className="text-sm font-black text-violet-400">
                        {Math.round(a.commissionRate * 100)}%
                      </div>
                      <div className="text-sm font-bold text-white text-right">{fmt(a.balance)}</div>
                      <div className="text-sm text-emerald-400 text-right">{fmt(a.totalEarned)}</div>
                      <div className="text-sm text-slate-300 text-right">
                        {a._count.referredUsers}
                        {a._count.subAffiliates > 0 && (
                          <span className="text-[10px] text-slate-600 ml-1">+{a._count.subAffiliates} sub</span>
                        )}
                      </div>
                      <div className="text-xs text-violet-400 text-right">Detalhes →</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-xl border border-[#1e1532] text-sm text-slate-400 hover:text-white disabled:opacity-40 transition-colors">← Anterior</button>
                <span className="text-sm text-slate-500">{page} / {pages}</span>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="px-4 py-2 rounded-xl border border-[#1e1532] text-sm text-slate-400 hover:text-white disabled:opacity-40 transition-colors">Próxima →</button>
              </div>
            )}
          </>
        )}

        {/* PENDING TAB */}
        {tab === "pending" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Afiliados cadastrados pelo site oficial aguardando aprovação.</p>

            <div className="bg-[#0d0a1a] border border-[#1e1532] rounded-2xl overflow-hidden">
              {loadingPending ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-5 h-5 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                </div>
              ) : pendingAffs.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-sm">Nenhum cadastro pendente.</div>
              ) : (
                <div className="divide-y divide-[#1e1532]">
                  {pendingAffs.map((a) => (
                    <div key={a.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold text-white text-sm">{a.name}</div>
                          <div className="text-xs text-slate-500">{a.email}</div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            {new Date(a.createdAt).toLocaleString("pt-BR")}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Commission rate input */}
                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] text-slate-600 uppercase tracking-wide">Rev. Share</label>
                            <div className="flex items-center gap-1 bg-[#080c14] border border-[#1e1532] rounded-lg px-2 py-1.5">
                              <input
                                type="number"
                                value={pendingRate[a.id] ?? "90"}
                                onChange={(e) => setPendingRate((prev) => ({ ...prev, [a.id]: e.target.value }))}
                                min={1} max={100} step={1}
                                className="w-10 bg-transparent text-white text-sm font-bold text-right focus:outline-none"
                              />
                              <span className="text-slate-500 text-xs">%</span>
                            </div>
                          </div>
                          {/* Approve */}
                          <button
                            onClick={() => handlePendingAction(a.id, "approve")}
                            disabled={actioning === a.id}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {actioning === a.id ? "…" : "Aprovar"}
                          </button>
                          {/* Reject */}
                          <button
                            onClick={() => handlePendingAction(a.id, "reject")}
                            disabled={actioning === a.id}
                            className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Rejeitar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* WITHDRAWALS TAB */}
        {tab === "withdrawals" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(["PENDING", "ALL"] as const).map((s) => (
                <button key={s} onClick={() => setWTab(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${wTab === s ? "bg-violet-500/15 text-violet-400 border border-violet-500/20" : "text-slate-400 border border-[#1e1532]"}`}>
                  {s === "PENDING" ? "Pendentes" : "Todos"}
                </button>
              ))}
            </div>

            <div className="bg-[#0d0a1a] border border-[#1e1532] rounded-2xl overflow-hidden">
              {loadingW ? (
                <div className="flex items-center justify-center py-16"><div className="w-5 h-5 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" /></div>
              ) : withdrawals.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-sm">Nenhum saque encontrado.</div>
              ) : (
                <div className="divide-y divide-[#1e1532]">
                  {withdrawals.map((w) => (
                    <div key={w.id} className="px-6 py-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-white text-sm">{w.affiliate.name}</div>
                        <div className="text-xs text-slate-500">{w.affiliate.email}</div>
                        <div className="text-xs text-slate-500 mt-0.5 font-mono">{w.pixKey}</div>
                        <div className="text-xs text-slate-600">{new Date(w.createdAt).toLocaleString("pt-BR")}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-black text-white">{fmt(w.amount)}</div>
                        {w.status === "PENDING" ? (
                          <div className="flex gap-2 mt-2 justify-end">
                            <button onClick={() => handleWithdrawalAction(w.id, "APPROVED")}
                              className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                              Aprovar
                            </button>
                            <button onClick={() => handleWithdrawalAction(w.id, "REJECTED")}
                              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                              Rejeitar
                            </button>
                          </div>
                        ) : (
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${w.status === "APPROVED" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                            {w.status === "APPROVED" ? "Aprovado" : "Rejeitado"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}>
          <div className="bg-[#0d0a1a] border border-[#1e1532] rounded-2xl w-full max-w-2xl my-8" onClick={(e) => e.stopPropagation()}>
            {loadingDetail ? (
              <div className="flex items-center justify-center py-16"><div className="w-5 h-5 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" /></div>
            ) : detail ? (
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white">{detail.name}</h2>
                    <p className="text-slate-400 text-sm">{detail.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-bold ${LEVEL_COLOR[detail.level] ?? "text-slate-400"}`}>
                        {LEVEL_LABEL[detail.level] ?? `Nível ${detail.level}`}
                      </span>
                      {detail.parentAffiliate && (
                        <span className="text-xs text-slate-600">
                          · Recrutado por <span className="text-slate-400">{detail.parentAffiliate.name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelectedId(null)} className="text-slate-500 hover:text-white text-xl">✕</button>
                </div>

                {/* Edit acordo + saldo */}
                <div className="bg-[#080c14] border border-[#1e1532] rounded-xl p-4 space-y-4">
                  <h3 className="font-bold text-white text-sm">Editar acordo e saldo</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">Revenue share (%)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editRate}
                          onChange={(e) => setEditRate(e.target.value)}
                          min={0} max={100} step={1}
                          className="flex-1 bg-[#0d0a1a] border border-[#1e1532] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/40"
                        />
                        <span className="text-slate-500 text-sm">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">Saldo (USD)</label>
                      <input
                        type="number"
                        value={editBalance}
                        onChange={(e) => setEditBalance(e.target.value)}
                        step="0.01"
                        className="w-full bg-[#0d0a1a] border border-[#1e1532] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">Nível (1–4)</label>
                      <select
                        value={editLevel}
                        onChange={(e) => setEditLevel(e.target.value)}
                        className="w-full bg-[#0d0a1a] border border-[#1e1532] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/40"
                      >
                        <option value="1">1 — Direto</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4 — Só divulga</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={handleSave} disabled={saving}
                    className="bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white font-bold text-sm px-5 py-2 rounded-xl transition-colors">
                    {saving ? "Salvando…" : "Salvar alterações"}
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Saldo", value: fmt(detail.balance), color: "text-violet-400" },
                    { label: "Total ganho", value: fmt(detail.totalEarned), color: "text-emerald-400" },
                    { label: "Jogadores", value: String(detail._count.referredUsers), color: "text-white" },
                    { label: "Sub-afiliados", value: String(detail._count.subAffiliates), color: "text-sky-400" },
                    { label: "Receitas", value: String(detail._count.revenues), color: "text-violet-400" },
                    { label: "Saques", value: String(detail._count.withdrawals), color: "text-slate-300" },
                  ].map((s) => (
                    <div key={s.label} className="bg-[#080c14] border border-[#1e1532] rounded-xl p-3 text-center">
                      <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
                      <div className="text-[10px] text-slate-600">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Sub-affiliates */}
                {detail.subAffiliates.length > 0 && (
                  <div>
                    <h3 className="font-bold text-white text-sm mb-3">Sub-afiliados ({detail.subAffiliates.length})</h3>
                    <div className="space-y-2">
                      {detail.subAffiliates.map((s) => (
                        <div key={s.id} className="bg-[#080c14] border border-[#1e1532] rounded-xl px-4 py-3 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-white">{s.name}</div>
                            <div className="text-xs text-slate-500">{s.email} · {LEVEL_LABEL[s.level]}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-violet-400">{Math.round(s.commissionRate * 100)}%</div>
                            <div className="text-xs text-slate-600">{s._count.referredUsers} jogadores</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Move player */}
                <div className="bg-[#080c14] border border-[#1e1532] rounded-xl p-4">
                  <h3 className="font-bold text-white text-sm mb-3">Mover jogador de base</h3>
                  <form onSubmit={handleMovePlayer} className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">ID do jogador</label>
                      <input
                        type="text"
                        value={moveUserId}
                        onChange={(e) => setMoveUserId(e.target.value)}
                        placeholder="cuid do usuário"
                        className="w-full bg-[#0d0a1a] border border-[#1e1532] rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-violet-500/40 placeholder-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">ID do afiliado destino (vazio = remover)</label>
                      <input
                        type="text"
                        value={moveToAffId}
                        onChange={(e) => setMoveToAffId(e.target.value)}
                        placeholder="cuid do afiliado destino (opcional)"
                        className="w-full bg-[#0d0a1a] border border-[#1e1532] rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-violet-500/40 placeholder-slate-700"
                      />
                    </div>
                    <button type="submit" disabled={moving || !moveUserId.trim()}
                      className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold text-sm px-5 py-2 rounded-xl transition-colors">
                      {moving ? "Movendo…" : "Mover jogador"}
                    </button>
                  </form>
                </div>

                {/* Players list */}
                {detail.referredUsers.length > 0 && (
                  <div>
                    <h3 className="font-bold text-white text-sm mb-3">Jogadores vinculados ({detail._count.referredUsers})</h3>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {detail.referredUsers.map((u) => (
                        <div key={u.id} className="bg-[#080c14] border border-[#1e1532] rounded-lg px-3 py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-white font-medium">{u.name}</span>
                            <span className="text-slate-600 ml-2 font-mono">{u.id.slice(-8)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-violet-400 font-bold">{fmt(u.realBalance)}</span>
                            <span className="text-slate-600 ml-2">{u.affiliateLinkSlug ?? "—"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delete */}
                <div className="border-t border-[#1e1532] pt-4">
                  <button onClick={handleDelete}
                    className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
                    Excluir afiliado
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
