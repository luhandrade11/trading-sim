"use client";

import { useEffect, useState } from "react";

interface Settings {
  globalDemoRate:       string;
  globalRealRate:       string;
  pixGateway:           string;
  maintenanceMode:      string;
  welcomeBonusDemo:     string;
  welcomeBonusReal:     string;
  firstDepositBonusPct: string;
  cashbackPct:          string;
  cashbackMinLossUsd:   string;
  missionRewardUsd:     string;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings>({
    globalDemoRate:       "60",
    globalRealRate:       "35",
    pixGateway:           "abacatepay",
    maintenanceMode:      "false",
    welcomeBonusDemo:     "0",
    welcomeBonusReal:     "0",
    firstDepositBonusPct: "50",
    cashbackPct:          "5",
    cashbackMinLossUsd:   "40",
    missionRewardUsd:     "10",
  });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true); setError(""); setSaved(false);

    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        globalDemoRate:       Number(settings.globalDemoRate),
        globalRealRate:       Number(settings.globalRealRate),
        pixGateway:           settings.pixGateway,
        maintenanceMode:      settings.maintenanceMode,
        welcomeBonusDemo:     Number(settings.welcomeBonusDemo),
        welcomeBonusReal:     Number(settings.welcomeBonusReal),
        firstDepositBonusPct: Number(settings.firstDepositBonusPct),
        cashbackPct:          Number(settings.cashbackPct),
        cashbackMinLossUsd:   Number(settings.cashbackMinLossUsd),
        missionRewardUsd:     Number(settings.missionRewardUsd),
      }),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = await res.json();
      setError(d.error ?? "Erro ao salvar");
    }
    setSaving(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-white/20 border-t-violet-400/60 rounded-full animate-spin" />
    </div>
  );

  const demoRate = Number(settings.globalDemoRate);
  const realRate = Number(settings.globalRealRate);

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-slate-500 text-sm mt-1">Controles globais da plataforma</p>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-sm mb-6">{error}</div>
      )}

      <div className="space-y-6">
        {/* Win rates */}
        <div className="bg-[#0d0a1a] border border-[#1e1532] rounded-2xl p-6">
          <h2 className="text-white font-bold mb-1">Controle de Win Rate Global</h2>
          <p className="text-slate-500 text-xs mb-5">
            Altera a taxa de vitória para todos os usuários (sem override individual).
            Afeta novos trades após a próxima atualização do usuário.
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs text-slate-400 uppercase font-semibold tracking-wide">
                Win Rate Demo (%)
              </label>
              <input
                type="range" min="0" max="100" step="1"
                value={settings.globalDemoRate}
                onChange={(e) => setSettings((s) => ({ ...s, globalDemoRate: e.target.value }))}
                className="w-full mt-3 accent-violet-400"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-slate-600 text-xs">0% (sempre perde)</span>
                <span className={`text-2xl font-black font-mono ${
                  demoRate >= 55 ? "text-emerald-400" : demoRate >= 40 ? "text-violet-400" : "text-rose-400"
                }`}>{settings.globalDemoRate}%</span>
                <span className="text-slate-600 text-xs">100% (sempre ganha)</span>
              </div>
              <p className="text-center text-slate-500 text-xs mt-1">
                {demoRate >= 60 ? "Modo captação — usuário sente que é bom" :
                 demoRate >= 45 ? "Equilibrado" : "Modo lucro — usuário perde mais"}
              </p>
            </div>

            <div>
              <label className="text-xs text-slate-400 uppercase font-semibold tracking-wide">
                Win Rate Real (%)
              </label>
              <input
                type="range" min="0" max="100" step="1"
                value={settings.globalRealRate}
                onChange={(e) => setSettings((s) => ({ ...s, globalRealRate: e.target.value }))}
                className="w-full mt-3 accent-violet-400"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-slate-600 text-xs">0%</span>
                <span className={`text-2xl font-black font-mono ${
                  realRate >= 50 ? "text-rose-400" : realRate >= 35 ? "text-violet-400" : "text-emerald-400"
                }`}>{settings.globalRealRate}%</span>
                <span className="text-slate-600 text-xs">100%</span>
              </div>
              <p className="text-center text-slate-500 text-xs mt-1">
                {realRate <= 30 ? "Alta margem — casa lucra muito" :
                 realRate <= 45 ? "Margem saudável" : "Usuários ganham demais"}
              </p>
            </div>
          </div>
        </div>

        {/* Payment gateway */}
        <div className="bg-[#0d0a1a] border border-[#1e1532] rounded-2xl p-6">
          <h2 className="text-white font-bold mb-1">Gateway de Pagamento PIX</h2>
          <p className="text-slate-500 text-xs mb-4">Qual provedor processar os depósitos PIX</p>

          <div className="flex gap-3">
            {[
              { value: "abacatepay", label: "AbacatePay",   desc: "PIX transparente · QR code inline" },
              { value: "manual",     label: "Manual",        desc: "Admin processa manualmente" },
            ].map((opt) => (
              <label key={opt.value}
                className={`flex-1 border rounded-xl p-4 cursor-pointer transition-all ${
                  settings.pixGateway === opt.value
                    ? "border-violet-500/50 bg-violet-500/5"
                    : "border-[#1e1532] hover:border-[#2e1e52]"
                }`}
              >
                <input type="radio" name="pixGateway" value={opt.value}
                  checked={settings.pixGateway === opt.value}
                  onChange={(e) => setSettings((s) => ({ ...s, pixGateway: e.target.value }))}
                  className="hidden" />
                <p className={`font-semibold text-sm ${settings.pixGateway === opt.value ? "text-violet-400" : "text-white"}`}>
                  {opt.label}
                </p>
                <p className="text-slate-500 text-xs mt-1">{opt.desc}</p>
              </label>
            ))}
          </div>
        </div>

        {/* Welcome bonus */}
        <div className="bg-[#0d0a1a] border border-[#1e1532] rounded-2xl p-6">
          <h2 className="text-white font-bold mb-1">Bônus de Boas-Vindas</h2>
          <p className="text-slate-500 text-xs mb-5">
            Crédito extra concedido a cada novo usuário no cadastro.
            Demo: somado aos $5.000 iniciais. Real: adicionado ao saldo real.
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Bônus Demo (USD)</label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                <input
                  type="number" min="0" step="1"
                  value={settings.welcomeBonusDemo}
                  onChange={(e) => setSettings((s) => ({ ...s, welcomeBonusDemo: e.target.value }))}
                  className="w-full bg-[#080c14] border border-[#1e1532] rounded-xl pl-7 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/40"
                />
              </div>
              <p className="text-slate-600 text-xs mt-1">
                {Number(settings.welcomeBonusDemo) > 0
                  ? `Conta demo começa com $${5000 + Number(settings.welcomeBonusDemo)}`
                  : "Sem bônus demo (padrão $5.000)"}
              </p>
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Bônus Real (USD)</label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                <input
                  type="number" min="0" step="1"
                  value={settings.welcomeBonusReal}
                  onChange={(e) => setSettings((s) => ({ ...s, welcomeBonusReal: e.target.value }))}
                  className="w-full bg-[#080c14] border border-[#1e1532] rounded-xl pl-7 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/40"
                />
              </div>
              <p className="text-slate-600 text-xs mt-1">
                {Number(settings.welcomeBonusReal) > 0
                  ? `Usuário inicia com $${Number(settings.welcomeBonusReal)} reais`
                  : "Sem bônus real"}
              </p>
            </div>
          </div>
        </div>

        {/* Monetization settings */}
        <div className="bg-[#0d0a1a] border border-[#1e1532] rounded-2xl p-6">
          <h2 className="text-white font-bold mb-1">Monetização</h2>
          <p className="text-slate-500 text-xs mb-5">Bônus de primeiro depósito, cashback e recompensas de missão.</p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Bônus 1º Depósito (%)</label>
              <div className="relative mt-2">
                <input
                  type="number" min="0" max="200" step="1"
                  value={settings.firstDepositBonusPct}
                  onChange={(e) => setSettings((s) => ({ ...s, firstDepositBonusPct: e.target.value }))}
                  className="w-full bg-[#080c14] border border-[#1e1532] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/40"
                />
              </div>
              <p className="text-slate-600 text-xs mt-1">
                {Number(settings.firstDepositBonusPct) > 0 ? `+${settings.firstDepositBonusPct}% sobre o primeiro depósito` : "Sem bônus"}
              </p>
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Cashback (%)</label>
              <div className="relative mt-2">
                <input
                  type="number" min="0" max="100" step="1"
                  value={settings.cashbackPct}
                  onChange={(e) => setSettings((s) => ({ ...s, cashbackPct: e.target.value }))}
                  className="w-full bg-[#080c14] border border-[#1e1532] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/40"
                />
              </div>
              <p className="text-slate-600 text-xs mt-1">% de cashback sobre perdas diárias reais</p>
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Perda Mínima Cashback (USD)</label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                <input
                  type="number" min="0" step="1"
                  value={settings.cashbackMinLossUsd}
                  onChange={(e) => setSettings((s) => ({ ...s, cashbackMinLossUsd: e.target.value }))}
                  className="w-full bg-[#080c14] border border-[#1e1532] rounded-xl pl-7 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/40"
                />
              </div>
              <p className="text-slate-600 text-xs mt-1">Perda mínima para ativar cashback</p>
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Recompensa de Missão (USD)</label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                <input
                  type="number" min="0" step="1"
                  value={settings.missionRewardUsd}
                  onChange={(e) => setSettings((s) => ({ ...s, missionRewardUsd: e.target.value }))}
                  className="w-full bg-[#080c14] border border-[#1e1532] rounded-xl pl-7 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/40"
                />
              </div>
              <p className="text-slate-600 text-xs mt-1">Recompensa por missão diária completa</p>
            </div>
          </div>
        </div>

        {/* Maintenance mode */}
        <div className="bg-[#0d0a1a] border border-[#1e1532] rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold">Modo Manutenção</h2>
              <p className="text-slate-500 text-xs mt-1">Bloqueia novos trades de todos os usuários</p>
            </div>
            <button
              onClick={() => setSettings((s) => ({ ...s, maintenanceMode: s.maintenanceMode === "true" ? "false" : "true" }))}
              className={`w-14 h-7 rounded-full transition-colors relative ${
                settings.maintenanceMode === "true" ? "bg-rose-500" : "bg-slate-700"
              }`}
            >
              <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${
                settings.maintenanceMode === "true" ? "left-8" : "left-1"
              }`} />
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className={`mt-6 w-full font-bold rounded-xl py-3 text-sm transition-all ${
          saved
            ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
            : "bg-gradient-to-r from-violet-500 to-violet-400 hover:from-violet-400 hover:to-violet-300 text-white"
        } disabled:opacity-50`}
      >
        {saving ? "Salvando…" : saved ? "✓ Salvo!" : "Salvar Configurações"}
      </button>
    </div>
  );
}
