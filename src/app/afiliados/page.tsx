import Link from "next/link";

export default function AfiliadosLandingPage() {
  return (
    <div className="min-h-screen bg-[#080c14] text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="border-b border-[#1e2a42]/60 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-[#080c14] font-black text-sm">PB</span>
          </div>
          <span className="font-bold text-lg tracking-tight">
            <span className="text-white">Prime</span>
            <span className="text-emerald-400"> Broker</span>
            <span className="text-slate-500 font-normal text-sm ml-2">Afiliados</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/afiliados/login" className="text-slate-400 hover:text-white text-sm transition-colors px-4 py-2">
            Entrar
          </Link>
          <Link href="/afiliados/register" className="bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-[#080c14] font-bold text-sm px-5 py-2.5 rounded-xl transition-all">
            Seja afiliado
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="inline-flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-4 py-1.5 text-emerald-400 text-xs font-semibold tracking-wide uppercase mb-8">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          Programa de Afiliados Premium
        </div>

        <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 relative">
          Ganhe{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
            90%
          </span>
          <br />
          de revenue share
        </h1>

        <p className="text-slate-400 text-xl max-w-2xl mx-auto leading-relaxed mb-12">
          Indique traders para a Prime Broker e receba{" "}
          <strong className="text-white">90% do lucro gerado pelas perdas</strong>{" "}
          dos seus indicados — diretamente na sua carteira, em tempo real.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/afiliados/register"
            className="bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-[#080c14] font-black text-lg px-10 py-4 rounded-2xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)]"
          >
            Começar agora — grátis
          </Link>
          <Link
            href="/afiliados/login"
            className="border border-[#1e2a42] hover:border-emerald-500/40 text-slate-300 hover:text-white font-semibold text-lg px-10 py-4 rounded-2xl transition-all"
          >
            Acessar meu dashboard
          </Link>
        </div>

        {/* Social proof numbers */}
        <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-20 relative">
          {[
            { value: "90%", label: "Revenue share" },
            { value: "24h", label: "Saque via PIX" },
            { value: "∞", label: "Sem limite de ganhos" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-black text-emerald-400">{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-[#1e2a42]/40">
        <div className="text-center mb-16">
          <p className="text-emerald-400/70 text-xs font-semibold tracking-[0.2em] uppercase mb-3">Como funciona</p>
          <h2 className="text-4xl font-black">Simples assim.</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              num: "01",
              title: "Crie seus links",
              desc: "Gere links de divulgação personalizados com um clique no seu dashboard.",
              icon: "🔗",
            },
            {
              num: "02",
              title: "Indique traders",
              desc: "Divulgue nas redes sociais, grupos e canais. Cada clique é rastreado automaticamente.",
              icon: "📣",
            },
            {
              num: "03",
              title: "Receba 90%",
              desc: "A cada perda real dos seus indicados, 90% cai instantaneamente no seu saldo.",
              icon: "💰",
            },
          ].map((step) => (
            <div
              key={step.num}
              className="bg-[#0d1117] border border-[#1e2a42] rounded-2xl p-8 hover:border-emerald-500/20 transition-colors group"
            >
              <div className="text-4xl mb-4">{step.icon}</div>
              <div className="text-emerald-400/40 text-xs font-bold tracking-widest mb-2 group-hover:text-emerald-400/70 transition-colors">
                {step.num}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard preview / features */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-[#1e2a42]/40">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-emerald-400/70 text-xs font-semibold tracking-[0.2em] uppercase mb-4">Dashboard profissional</p>
            <h2 className="text-4xl font-black leading-tight mb-6">
              Tudo que você precisa<br />
              <span className="text-emerald-400">em um só lugar</span>
            </h2>
            <p className="text-slate-400 leading-relaxed mb-8">
              Seu dashboard de afiliado foi desenhado para te dar total controle e visibilidade sobre seus ganhos — como um verdadeiro gateway de pagamentos.
            </p>
            <ul className="space-y-4">
              {[
                "Saldo em tempo real com histórico completo",
                "Gerenciador de links com rastreamento de cliques",
                "Lista de jogadores com receita por indicado",
                "Histórico de receitas operação por operação",
                "Saques via PIX a qualquer momento",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-400 text-xs">✓</span>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Mock dashboard card */}
          <div className="bg-[#0d1117] border border-[#1e2a42] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Saldo disponível</span>
              <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">● Ao vivo</span>
            </div>
            <p className="text-4xl font-black text-white font-mono mb-1">$4.872<span className="text-slate-600">.50</span></p>
            <p className="text-emerald-400 text-sm font-semibold mb-8">+$342.00 hoje</p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Jogadores", value: "23" },
                { label: "Este mês", value: "$1.240" },
                { label: "Total ganho", value: "$9.800" },
              ].map((m) => (
                <div key={m.label} className="bg-[#080c14] rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-white">{m.value}</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2.5">
              {[
                { name: "João M.", amount: "+$18.00", time: "há 3min" },
                { name: "Ana P.", amount: "+$45.00", time: "há 12min" },
                { name: "Carlos R.", amount: "+$9.00", time: "há 28min" },
              ].map((t) => (
                <div key={t.name} className="flex items-center justify-between bg-[#080c14] rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 rounded-full flex items-center justify-center text-[10px] font-bold text-emerald-400">
                      {t.name[0]}
                    </div>
                    <span className="text-xs text-slate-300">{t.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-400">{t.amount}</div>
                    <div className="text-[10px] text-slate-600">{t.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-[#1e2a42]/40 text-center">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-3xl p-16">
          <h2 className="text-5xl font-black mb-4">
            Comece a faturar <span className="text-emerald-400">hoje</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10 max-w-lg mx-auto">
            Cadastro gratuito, sem burocracia. Em menos de 2 minutos você já terá seu primeiro link pronto.
          </p>
          <Link
            href="/afiliados/register"
            className="inline-block bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-[#080c14] font-black text-xl px-14 py-5 rounded-2xl transition-all shadow-[0_0_40px_rgba(16,185,129,0.4)]"
          >
            Criar minha conta grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e2a42]/40 py-8 text-center text-slate-600 text-sm">
        © 2025 Prime Broker — Programa de Afiliados
      </footer>
    </div>
  );
}
