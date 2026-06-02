"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// SVG icon components
const IcoDashboard  = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>;
const IcoLinks      = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>;
const IcoPlayers    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>;
const IcoNetwork    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>;
const IcoRevenues   = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>;
const IcoWithdraw   = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
const IcoSupport    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"/></svg>;
const IcoProfile    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>;

const BASE_NAV = [
  { href: "/afiliados/dashboard",          label: "Visão geral",  Icon: IcoDashboard },
  { href: "/afiliados/dashboard/links",    label: "Meus links",   Icon: IcoLinks },
  { href: "/afiliados/dashboard/players",  label: "Jogadores",    Icon: IcoPlayers },
  { href: "/afiliados/dashboard/rede",     label: "Minha rede",   Icon: IcoNetwork },
  { href: "/afiliados/dashboard/revenues", label: "Receitas",     Icon: IcoRevenues },
  { href: "/afiliados/dashboard/saques",   label: "Saques",       Icon: IcoWithdraw },
  { href: "/afiliados/dashboard/suporte",  label: "Suporte",      Icon: IcoSupport },
  { href: "/afiliados/dashboard/perfil",   label: "Perfil",       Icon: IcoProfile },
];

interface Me {
  id: string;
  name: string;
  balance: number;
  commissionRate: number;
  level: number;
  photo?: string | null;
}

export default function AfiliadosDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [me, setMe]             = useState<Me | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/afiliados/me")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          if (r.status === 403 && d.statusCode) {
            router.push(`/afiliados/login?status=${d.statusCode}`);
          } else {
            router.push("/afiliados/login");
          }
          return;
        }
        setMe(d);
      })
      .catch(() => router.push("/afiliados/login"));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/afiliados/logout", { method: "POST" });
    router.push("/afiliados/login");
  }

  const navItems = BASE_NAV.filter((item) => {
    if (item.href === "/afiliados/dashboard/rede" && me?.level === 4) return false;
    return true;
  });

  const initials = me?.name?.slice(0, 2).toUpperCase() ?? "AF";

  return (
    <div className="min-h-screen bg-[#080c14] text-white flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#090e1a] border-r border-white/5 flex flex-col transition-transform duration-300 ${menuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Prime Broker" className="w-12 h-12 object-contain" />
            <div>
              <div className="font-bold text-sm text-white leading-tight">Prime Afiliados</div>
              <div className="text-[10px] text-slate-500">Central do afiliado</div>
            </div>
          </div>
        </div>

        {/* Balance card */}
        <div className="mx-4 mt-5">
          <div className="relative bg-gradient-to-br from-emerald-500/12 to-emerald-600/4 border border-emerald-500/20 rounded-2xl p-4 overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-400/6 rounded-full blur-2xl pointer-events-none" />
            <div className="text-[9px] text-emerald-400/50 uppercase tracking-[0.2em] font-semibold mb-1">Saldo disponível</div>
            <div className="text-2xl font-black text-white tabular-nums">
              {me ? `$${me.balance.toFixed(2)}` : <span className="opacity-30">···</span>}
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              {me ? `Acordo: ${Math.round((me.commissionRate ?? 0.9) * 100)}% RS` : <span className="opacity-30">···</span>}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, Icon }) => {
            const active = pathname === href || (href !== "/afiliados/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  active
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-500 hover:text-slate-200 hover:bg-white/4 border border-transparent"
                }`}
              >
                <span className={`flex-shrink-0 transition-transform duration-150 ${active ? "text-emerald-400" : "text-slate-600 group-hover:text-slate-300"}`}>
                  <Icon />
                </span>
                <span className="flex-1">{label}</span>
                {active && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
              {me?.photo ? (
                <img src={me.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 flex items-center justify-center text-xs font-black text-emerald-400">
                  {initials}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-300 truncate">{me?.name ?? <span className="opacity-30">···</span>}</div>
              <Link href="/afiliados/dashboard/perfil" className="text-[10px] text-slate-600 hover:text-emerald-400 transition-colors">
                Editar perfil
              </Link>
            </div>
            <button onClick={handleLogout} className="text-slate-600 hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-rose-400/8" title="Sair">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden" onClick={() => setMenuOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar mobile */}
        <header className="sticky top-0 z-20 bg-[#080c14]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between lg:hidden">
          <button onClick={() => setMenuOpen(true)} className="text-slate-400 hover:text-white transition-colors p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="font-bold text-sm">
            <span className="text-white">Prime</span>
            <span className="text-emerald-400"> Afiliados</span>
          </span>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
            {me?.photo ? (
              <img src={me.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-emerald-400/20 flex items-center justify-center text-xs font-bold text-emerald-400">{initials}</div>
            )}
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-8 pb-24 lg:pb-8">
          {children}
        </main>

        {/* Bottom tab bar — mobile only */}
        <nav className="fixed bottom-0 left-0 right-0 z-20 lg:hidden bg-[#090e1a]/95 backdrop-blur-xl border-t border-white/5 flex items-stretch">
          {[
            { href: "/afiliados/dashboard",          label: "Início",    Icon: IcoDashboard },
            { href: "/afiliados/dashboard/links",    label: "Links",     Icon: IcoLinks },
            { href: "/afiliados/dashboard/players",  label: "Jogadores", Icon: IcoPlayers },
            { href: "/afiliados/dashboard/revenues", label: "Receitas",  Icon: IcoRevenues },
            { href: "/afiliados/dashboard/saques",   label: "Saques",    Icon: IcoWithdraw },
          ].map(({ href, label, Icon }) => {
            const active = href === "/afiliados/dashboard"
              ? pathname === href
              : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-[10px] font-semibold transition-colors border-t-2 ${
                  active
                    ? "text-emerald-400 border-emerald-400"
                    : "text-slate-600 hover:text-slate-400 border-transparent"
                }`}
              >
                <span><Icon /></span>
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
