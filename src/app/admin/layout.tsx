"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const IcoDashboard  = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={1.5}/><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={1.5}/><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={1.5}/><rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={1.5}/></svg>;
const IcoUsers      = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>;
const IcoWithdraw   = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>;
const IcoAfiliados  = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>;
const IcoTickets    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>;
const IcoFraud      = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>;
const IcoAudit      = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>;
const IcoSettings   = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3" strokeWidth={1.5}/></svg>;
const IcoLogout     = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>;

const navItems = [
  { href: "/admin",             label: "Dashboard",  Icon: IcoDashboard },
  { href: "/admin/users",       label: "Usuários",   Icon: IcoUsers },
  { href: "/admin/withdrawals", label: "Saques",     Icon: IcoWithdraw },
  { href: "/admin/afiliados",   label: "Afiliados",  Icon: IcoAfiliados },
  { href: "/admin/tickets",     label: "Suporte",    Icon: IcoTickets },
  { href: "/admin/fraud",       label: "Fraudes",    Icon: IcoFraud },
  { href: "/admin/audit",       label: "Auditoria",  Icon: IcoAudit },
  { href: "/admin/settings",    label: "Config",     Icon: IcoSettings },
];

const IcoMenu   = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>;
const IcoClose  = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [navOpen, setNavOpen] = useState(false);

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    if (navOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [navOpen]);

  async function handleLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
  }

  if (pathname === "/admin/login") return <>{children}</>;

  const currentLabel =
    navItems.find(({ href }) =>
      href === "/admin" ? pathname === "/admin" : pathname.startsWith(href),
    )?.label ?? "Admin";

  return (
    <div className="min-h-screen bg-[#070510] lg:flex">

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 bg-[#0b0818]/95 backdrop-blur border-b border-white/5">
        <button
          onClick={() => setNavOpen(true)}
          aria-label="Abrir menu"
          className="-ml-1 p-1.5 text-slate-300 hover:text-white rounded-lg transition-colors"
        >
          <IcoMenu />
        </button>
        <img src="/logo.png" alt="Prime Broker" className="w-7 h-7 object-contain" />
        <span className="text-white font-bold text-sm truncate">{currentLabel}</span>
      </header>

      {/* Mobile overlay */}
      {navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          aria-hidden="true"
        />
      )}

      {/* Sidebar — off-canvas drawer on mobile, static on desktop */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 lg:w-56 shrink-0 bg-[#0b0818] border-r border-white/5 flex flex-col transform transition-transform duration-300 ease-out lg:transform-none ${
          navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >

        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Prime Broker" className="w-9 h-9 object-contain" />
            <div>
              <p className="text-white font-black text-sm leading-tight">Prime Broker</p>
              <p className="text-violet-400/70 text-[10px] font-semibold tracking-wide">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={() => setNavOpen(false)}
            aria-label="Fechar menu"
            className="lg:hidden p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors"
          >
            <IcoClose />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, Icon }) => {
            const active = href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setNavOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  active
                    ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                    : "text-slate-500 hover:text-slate-200 hover:bg-white/4 border border-transparent"
                }`}
              >
                <span className={`flex-shrink-0 transition-colors ${active ? "text-violet-400" : "text-slate-600 group-hover:text-slate-300"}`}>
                  <Icon />
                </span>
                <span className="flex-1">{label}</span>
                {active && <span className="w-1.5 h-1.5 bg-violet-400 rounded-full flex-shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-rose-400 hover:bg-rose-500/6 transition-all w-full border border-transparent"
          >
            <IcoLogout />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-auto bg-[#070510]">
        {children}
      </main>
    </div>
  );
}
