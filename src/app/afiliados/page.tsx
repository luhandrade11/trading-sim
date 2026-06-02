import Link from "next/link";

export default function AfiliadosLandingPage() {
  return (
    <div className="min-h-screen bg-[#080c14] text-white overflow-x-hidden">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#080c14]/90 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Prime Broker" className="w-12 h-12 object-contain" />
          <div className="leading-tight">
            <div className="font-black text-sm text-white">Prime Broker</div>
            <div className="text-[10px] text-emerald-400/70 font-semibold tracking-wide">Afiliados</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/afiliados/login"
            className="text-slate-400 hover:text-white text-sm font-medium transition-colors px-3 py-2">
            Entrar
          </Link>
          <Link href="/afiliados/register"
            className="bg-emerald-500 hover:bg-emerald-400 text-[#080c14] font-black text-sm px-4 py-2 rounded-xl transition-all">
            Começar
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-4 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-24 text-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-emerald-500/8 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-3.5 py-1.5 text-emerald-400 text-[11px] font-bold tracking-widest uppercase mb-6">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Programa Premium de Afiliados
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.05] mb-5">
            Ganhe{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
              90%
            </span>
            <br />
            <span className="text-white">de revenue share</span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-8">
            Indique traders e receba{" "}
            <strong className="text-white">90% do lucro gerado pelas perdas</strong>{" "}
            dos seus indicados — em tempo real, via PIX.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-12">
            <Link
              href="/afiliados/register"
              className="bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-[#080c14] font-black text-base px-8 py-4 rounded-2xl transition-all shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] text-center"
            >
              Criar conta grátis →
            </Link>
            <Link
              href="/afiliados/login"
              className="border border-white/10 hover:border-emerald-500/40 text-slate-300 hover:text-white font-semibold text-base px-8 py-4 rounded-2xl transition-all text-center"
            >
              Acessar dashboard
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-sm mx-auto">
            {[
              { value: "90%", label: "Revenue share" },
              { value: "24h", label: "Saque PIX" },
              { value: "∞", label: "Sem limite" },
            ].map((s) => (
              <div key={s.label} className="bg-white/3 border border-white/6 rounded-2xl py-4 px-2">
                <div className="text-2xl sm:text-3xl font-black text-emerald-400">{s.value}</div>
                <div className="text-[10px] sm:text-xs text-slate-500 mt-1 leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 sm:px-6 py-14 sm:py-20 border-t border-white/5 max-w-5xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-emerald-400/60 text-[11px] font-bold tracking-[0.2em] uppercase mb-2">Como funciona</p>
          <h2 className="text-2xl sm:text-4xl font-black">3 passos. Simples assim.</h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              num: "01",
              title: "Crie seus links",
              desc: "Gere links de divulgação personalizados com um clique no dashboard.",
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                </svg>
              ),
            },
            {
              num: "02",
              title: "Indique traders",
              desc: "Divulgue nas redes e grupos. Cada clique é rastreado automaticamente.",
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              ),
            },
            {
              num: "03",
              title: "Receba 90%",
              desc: "A cada perda dos seus indicados, 90% cai no seu saldo instantaneamente.",
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              ),
            },
          ].map((step) => (
            <div
              key={step.num}
              className="bg-[#0d1117] border border-white/6 rounded-2xl p-5 sm:p-7 flex sm:flex-col gap-4 sm:gap-0"
            >
              <div className="flex items-center gap-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
                  {step.icon}
                </div>
                <span className="text-emerald-400/30 text-xs font-black tracking-widest sm:hidden">{step.num}</span>
              </div>
              <div>
                <div className="text-emerald-400/30 text-[10px] font-black tracking-widest mb-1 hidden sm:block">{step.num}</div>
                <h3 className="text-white font-bold text-base mb-1.5">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mock dashboard + features */}
      <section className="px-4 sm:px-6 py-14 sm:py-20 border-t border-white/5 max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Features list */}
          <div>
            <p className="text-emerald-400/60 text-[11px] font-bold tracking-[0.2em] uppercase mb-3">Dashboard profissional</p>
            <h2 className="text-2xl sm:text-4xl font-black leading-tight mb-4">
              Tudo que você precisa<br />
              <span className="text-emerald-400">em um só lugar</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-7">
              Controle total dos seus ganhos, indicados e saques — como um verdadeiro gateway de pagamentos.
            </p>
            <ul className="space-y-3">
              {[
                "Saldo em tempo real com histórico completo",
                "Links rastreados com métricas de cliques",
                "Lista de jogadores com receita por indicado",
                "Histórico de receitas operação por operação",
                "Saques via PIX a qualquer momento",
              ].map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="w-5 h-5 bg-emerald-500/15 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Mock card */}
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Saldo disponível</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full font-semibold">● Ao vivo</span>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-white font-mono mb-0.5">
              $4.872<span className="text-slate-600">.50</span>
            </p>
            <p className="text-emerald-400 text-sm font-semibold mb-6">+$342.00 hoje</p>

            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { label: "Jogadores", value: "23" },
                { label: "Este mês", value: "$1.240" },
                { label: "Total", value: "$9.800" },
              ].map((m) => (
                <div key={m.label} className="bg-[#080c14] rounded-xl p-2.5 text-center">
                  <div className="text-sm sm:text-base font-bold text-white">{m.value}</div>
                  <div className="text-[9px] text-slate-600 mt-0.5 leading-tight">{m.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {[
                { name: "João M.", amount: "+$18.00", time: "há 3min" },
                { name: "Ana P.", amount: "+$45.00", time: "há 12min" },
                { name: "Carlos R.", amount: "+$9.00", time: "há 28min" },
              ].map((tx) => (
                <div key={tx.name} className="flex items-center justify-between bg-[#080c14] rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-emerald-400/10 rounded-full flex items-center justify-center text-xs font-black text-emerald-400 shrink-0">
                      {tx.name[0]}
                    </div>
                    <span className="text-xs text-slate-300 font-medium">{tx.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-emerald-400">{tx.amount}</div>
                    <div className="text-[10px] text-slate-600">{tx.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 py-14 sm:py-20 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center bg-gradient-to-br from-emerald-500/8 to-transparent border border-emerald-500/15 rounded-3xl p-8 sm:p-14">
          <h2 className="text-3xl sm:text-5xl font-black mb-3">
            Comece a faturar <span className="text-emerald-400">hoje</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mb-8 max-w-sm mx-auto leading-relaxed">
            Cadastro gratuito. Em menos de 2 minutos você terá seu primeiro link pronto.
          </p>
          <Link
            href="/afiliados/register"
            className="inline-block bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-[#080c14] font-black text-lg px-10 py-4 rounded-2xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.35)]"
          >
            Criar minha conta grátis
          </Link>
          <p className="text-slate-700 text-xs mt-4">Sem cartão de crédito · Sem burocracia</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-slate-700 text-xs">
        © 2025 Prime Broker — Programa de Afiliados
      </footer>
    </div>
  );
}
