"use client";

import { useEffect, useState } from "react";

interface Me {
  id: string;
  name: string;
  email: string;
  photo: string | null;
  phone: string | null;
  cpf: string | null;
  docType: string | null;
  docNumber: string | null;
  pixKey: string | null;
  commissionRate: number;
  createdAt: string;
}

type Section = "personal" | "docs" | "pix";

function Field({
  label, value, onChange, placeholder, type = "text", disabled, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; disabled?: boolean; hint?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-[#080c14] border border-white/8 rounded-xl px-4 py-3 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      />
      {hint && <p className="text-[10px] text-slate-700 mt-1">{hint}</p>}
    </div>
  );
}

export default function AfiliadosPerfilPage() {
  const [me, setMe]       = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>("personal");

  // form fields
  const [name, setName]         = useState("");
  const [photo, setPhoto]       = useState("");
  const [phone, setPhone]       = useState("");
  const [cpf, setCpf]           = useState("");
  const [docType, setDocType]   = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [pixKey, setPixKey]     = useState("");

  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [saveError, setSaveError] = useState("");

  async function load() {
    const res = await fetch("/api/afiliados/me");
    const data = await res.json();
    setMe(data);
    setName(data.name ?? "");
    setPhoto(data.photo ?? "");
    setPhone(data.phone ?? "");
    setCpf(data.cpf ?? "");
    setDocType(data.docType ?? "");
    setDocNumber(data.docNumber ?? "");
    setPixKey(data.pixKey ?? "");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError("");

    const r = await fetch("/api/afiliados/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, photo: photo || null, phone: phone || null, cpf: cpf || null, docType: docType || null, docNumber: docNumber || null, pixKey: pixKey || null }),
    });
    const d = await r.json();
    if (!r.ok) { setSaveError(d.error || "Erro ao salvar"); setSaving(false); return; }
    setSaved(true);
    load();
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  const formatCpf = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  const initials = (name || me?.name || "AF").slice(0, 2).toUpperCase();
  const ratePercent = me ? Math.round(me.commissionRate * 100) : 0;
  const kycFields = [cpf, docType, docNumber].filter(Boolean).length;
  const kycComplete = kycFields === 3;

  const TABS: { id: Section; label: string; icon: string }[] = [
    { id: "personal", label: "Dados pessoais", icon: "◉" },
    { id: "docs",     label: "Documentos / KYC", icon: "◈" },
    { id: "pix",      label: "Chave PIX", icon: "↗" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Meu perfil</h1>
        <p className="text-slate-500 text-sm mt-0.5">Gerencie suas informações pessoais</p>
      </div>

      {/* Profile card */}
      <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-6">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/10">
              {photo ? (
                <img src={photo} alt="" className="w-full h-full object-cover" onError={() => setPhoto("")} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 flex items-center justify-center text-xl font-black text-emerald-400">
                  {initials}
                </div>
              )}
            </div>
            {kycComplete && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#0d1117] flex items-center justify-center">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-black text-white text-lg leading-tight truncate">{me?.name}</div>
            <div className="text-sm text-slate-500 truncate">{me?.email}</div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                {ratePercent}% RS
              </span>
              {kycComplete ? (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                  ✓ KYC completo
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 bg-white/4 border border-white/8 px-2.5 py-0.5 rounded-full font-semibold">
                  KYC {kycFields}/3
                </span>
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-[10px] text-slate-700 uppercase tracking-widest">Membro desde</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {me ? new Date(me.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/3 border border-white/6 rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
              section === tab.id
                ? "bg-[#0d1117] text-white border border-white/8 shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:block">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSave}>
        <div className="bg-[#0d1117] border border-white/6 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="font-bold text-white text-sm">{TABS.find((t) => t.id === section)?.label}</h2>
          </div>

          <div className="p-5 space-y-4">
            {section === "personal" && (
              <>
                <Field label="Nome completo" value={name} onChange={setName} placeholder="Seu nome completo" />
                <Field label="E-mail" value={me?.email ?? ""} onChange={() => {}} disabled hint="O e-mail não pode ser alterado" />
                <Field label="Telefone" value={phone} onChange={setPhone} placeholder="+55 (11) 99999-9999" type="tel" />
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                    Foto de perfil (URL)
                  </label>
                  <input
                    type="url"
                    value={photo}
                    onChange={(e) => setPhoto(e.target.value)}
                    placeholder="https://exemplo.com/sua-foto.jpg"
                    className="w-full bg-[#080c14] border border-white/8 rounded-xl px-4 py-3 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/15 transition-all"
                  />
                  {photo && (
                    <div className="mt-2 flex items-center gap-2">
                      <img
                        src={photo}
                        alt="preview"
                        className="w-10 h-10 rounded-xl object-cover border border-white/10"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <span className="text-[10px] text-slate-600">Preview da foto</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {section === "docs" && (
              <>
                <div className="bg-emerald-500/6 border border-emerald-500/15 rounded-xl px-4 py-3 flex items-start gap-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400 flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <p className="text-[11px] text-emerald-400/80 leading-relaxed">
                    Preencha seus documentos para habilitar saques acima de $500. Seus dados são criptografados e mantidos em sigilo.
                  </p>
                </div>
                <Field
                  label="CPF"
                  value={cpf}
                  onChange={(v) => setCpf(formatCpf(v))}
                  placeholder="000.000.000-00"
                  hint="Apenas números"
                />
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                    Tipo de documento
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full bg-[#080c14] border border-white/8 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/15 transition-all appearance-none"
                  >
                    <option value="" className="bg-[#080c14]">Selecione o documento</option>
                    <option value="RG" className="bg-[#080c14]">RG — Registro Geral</option>
                    <option value="CNH" className="bg-[#080c14]">CNH — Carteira de Habilitação</option>
                    <option value="PASSAPORTE" className="bg-[#080c14]">Passaporte</option>
                    <option value="RNE" className="bg-[#080c14]">RNE — Registro Nacional de Estrangeiros</option>
                  </select>
                </div>
                <Field
                  label="Número do documento"
                  value={docNumber}
                  onChange={setDocNumber}
                  placeholder="Número do documento selecionado"
                />
              </>
            )}

            {section === "pix" && (
              <>
                <div className="bg-emerald-500/6 border border-emerald-500/15 rounded-xl px-4 py-3 flex items-start gap-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400 flex-shrink-0 mt-0.5"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
                  <p className="text-[11px] text-emerald-400/80 leading-relaxed">
                    Sua chave PIX é usada para receber os saques. Certifique-se que a chave está correta e ativa na sua conta bancária.
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                    Chave PIX
                  </label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                    className="w-full bg-[#080c14] border border-white/8 rounded-xl px-4 py-3 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/15 transition-all"
                  />
                  <p className="text-[10px] text-slate-700 mt-1.5">
                    Esta chave será usada como destino padrão em todos os seus saques.
                  </p>
                </div>
                {pixKey && (
                  <div className="bg-white/3 border border-white/6 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest">Chave configurada</div>
                      <div className="text-sm font-mono text-white mt-0.5 truncate">{pixKey}</div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer / save */}
          <div className="px-5 pb-5 flex items-center justify-between gap-4">
            {saveError ? (
              <div className="text-rose-400 text-xs">{saveError}</div>
            ) : saved ? (
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Alterações salvas
              </div>
            ) : (
              <div />
            )}
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#080c14] font-bold text-sm px-6 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-[#080c14]/30 border-t-[#080c14] rounded-full animate-spin" />
                  Salvando…
                </>
              ) : (
                "Salvar alterações"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
