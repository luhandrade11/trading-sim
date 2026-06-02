"use client";

import { useEffect, useState } from "react";

interface LinkItem {
  id: string;
  slug: string;
  title: string;
  clicks: number;
  conversions: number;
  createdAt: string;
  url?: string;
}

export default function AfiliadosLinksPage() {
  const [links, setLinks]   = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle]   = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError]   = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function load() {
    const r = await fetch("/api/afiliados/links");
    const d = await r.json();
    setLinks(Array.isArray(d) ? d : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError("");
    const r = await fetch("/api/afiliados/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const d = await r.json();
    if (!r.ok) { setError(d.error || "Erro"); setCreating(false); return; }
    setLinks((prev) => [d, ...prev]);
    setTitle("");
    setCreating(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este link?")) return;
    await fetch(`/api/afiliados/links/${id}`, { method: "DELETE" });
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  function copy(slug: string) {
    const url = `${baseUrl}/ref/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(slug);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Meus links</h1>
        <p className="text-slate-500 text-sm mt-0.5">Crie e gerencie seus links de divulgação</p>
      </div>

      {/* Create form */}
      <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-6">
        <h2 className="font-bold text-white mb-4">Novo link</h2>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome do link (ex: Instagram Bio, Grupo WhatsApp)"
            maxLength={80}
            className="flex-1 bg-[#080c14] border border-white/6 rounded-xl px-4 py-3 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
          />
          <button
            type="submit"
            disabled={creating || !title.trim()}
            className="bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-50 text-[#080c14] font-bold text-sm px-6 py-3 rounded-xl transition-all sm:flex-shrink-0"
          >
            {creating ? "Criando…" : "Criar link"}
          </button>
        </form>
        {error && <p className="text-rose-400 text-xs mt-2">{error}</p>}
      </div>

      {/* Links list */}
      <div className="bg-[#0d1117] border border-white/6 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/6">
          <h2 className="font-bold text-white">Links ativos <span className="text-slate-500 font-normal text-sm">({links.length})</span></h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-25" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
            <p className="text-sm">Nenhum link criado ainda.</p>
            <p className="text-xs text-slate-600 mt-1">Crie seu primeiro link acima!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {links.map((link) => (
              <div key={link.id} className="px-5 py-4">
                {/* Title + delete */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-semibold text-white text-sm truncate">{link.title}</div>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="text-slate-600 hover:text-rose-400 text-xs transition-colors px-2 py-1 rounded-lg hover:bg-rose-400/10 flex-shrink-0"
                  >
                    Excluir
                  </button>
                </div>
                {/* URL + copy */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] text-emerald-400/70 font-mono bg-emerald-400/10 px-2 py-0.5 rounded-lg truncate flex-1 min-w-0">
                    {baseUrl}/ref/{link.slug}
                  </span>
                  <button
                    onClick={() => copy(link.slug)}
                    className="text-[10px] text-slate-500 hover:text-emerald-400 transition-colors border border-white/6 hover:border-emerald-500/30 px-2 py-1 rounded-lg flex-shrink-0"
                  >
                    {copied === link.slug ? "✓ Copiado!" : "Copiar"}
                  </button>
                </div>
                {/* Stats row */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-black text-white">{link.clicks}</span>
                    <span className="text-[10px] text-slate-600">cliques</span>
                  </div>
                  <div className="w-px h-3 bg-white/10" />
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-black text-emerald-400">{link.conversions}</span>
                    <span className="text-[10px] text-slate-600">cadastros</span>
                  </div>
                  <div className="w-px h-3 bg-white/10" />
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-black text-slate-300">
                      {link.clicks > 0 ? `${((link.conversions / link.clicks) * 100).toFixed(0)}%` : "—"}
                    </span>
                    <span className="text-[10px] text-slate-600">conv.</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-5">
        <h3 className="font-semibold text-white text-sm mb-3">Como usar seus links</h3>
        <ul className="space-y-2 text-xs text-slate-400">
          <li className="flex gap-2"><span className="text-emerald-400">1.</span> Copie o link e compartilhe em qualquer canal — redes sociais, grupos, anúncios.</li>
          <li className="flex gap-2"><span className="text-emerald-400">2.</span> Quando alguém clicar, é redirecionado para a página de cadastro da Prime Broker.</li>
          <li className="flex gap-2"><span className="text-emerald-400">3.</span> Ao se cadastrar, ele fica vinculado à sua conta permanentemente.</li>
          <li className="flex gap-2"><span className="text-emerald-400">4.</span> A cada perda real do seu indicado, você recebe 90% do valor instantaneamente.</li>
        </ul>
      </div>
    </div>
  );
}
