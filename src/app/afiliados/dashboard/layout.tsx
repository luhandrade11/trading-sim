"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const BASE_NAV = [
  { href: "/afiliados/dashboard",          label: "Visão geral",   icon: "◈" },
  { href: "/afiliados/dashboard/links",    label: "Meus links",    icon: "⛓" },
  { href: "/afiliados/dashboard/players",  label: "Jogadores",     icon: "👥" },
  { href: "/afiliados/dashboard/rede",     label: "Minha rede",    icon: "🌐" },
  { href: "/afiliados/dashboard/revenues", label: "Receitas",      icon: "◎" },
  { href: "/afiliados/dashboard/saques",   label: "Saques",        icon: "↗" },
  { href: "/afiliados/dashboard/perfil",   label: "Perfil",        icon: "◉" },
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
  const [me, setMe]           = useState<Me | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/afiliados/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { router.push("/afiliados/login"); return; }
        setMe(d);
      })
      .catch(() => router.push("/afiliados/login"));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/afiliados/logout", { method: "POST" });
    router.push("/afiliados/login");
  }

  // Level 4 cannot see "Minha Rede"
  const navItems = BASE_NAV.filter((item) => {
    if (item.href === "/afiliados/dashboard/rede" && me?.level === 4) return false;
    return true;
  });

  const initials = me?.name?.slice(0, 2).toUpperCase() ?? "AF";

  return (
    <div className="min-h-screen bg-[#080c14] text-white flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0a0f1a] border-r border-white/5 flex flex-col transition-transform duration-300 ${menuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-[#080c14] font-black text-xs">PB</span>
            </div>
            <div>
              <div className="font-bold text-sm text-white leading-tight">Prime Afiliados</div>
              <div className="text-[10px] text-slate-500">Central do afiliado</div>
            </div>
          </div>
        </div>

        {/* Balance card */}
        <div className="mx-4 mt-5">
          <div className="bg-gradient-to-br from-emerald-500/15 via-emerald-500/8 to-transparent border border-emerald-500/20 rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-400/5 rounded-full blur-xl" />
            <div className="text-[10px] text-emerald-400/60 uppercase tracking-[0.2em] font-semibold mb-1">Saldo disponível</div>
            <div className="text-2xl font-black text-white font-mono">
              ${me?.balance?.toFixed(2) ?? "···"}
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              {me ? `Acordo: ${Math.round((me.commissionRate ?? 0.9) * 100)}% RS` : "···"}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/afiliados/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  active
                    ? "bg-emerald-500/12 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-500 hover:text-white hover:bg-white/4"
                }`}
              >
                <span className={`text-sm transition-transform duration-150 ${active ? "" : "group-hover:scale-110"}`}>{item.icon}</span>
                {item.label}
                {active && <span className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
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
                <div className="w-full h-full bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 flex items-center justify-center text-xs font-black text-emerald-400">
                  {initials}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-300 truncate">{me?.name ?? "···"}</div>
              <Link href="/afiliados/dashboard/perfil" className="text-[10px] text-slate-600 hover:text-emerald-400 transition-colors">
                Editar perfil
              </Link>
            </div>
            <button onClick={handleLogout} className="text-slate-600 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-400/10" title="Sair">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
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

        <main className="flex-1 p-5 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
