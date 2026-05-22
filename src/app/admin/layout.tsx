"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { href: "/admin",             label: "Dashboard",  icon: "📊" },
  { href: "/admin/users",       label: "Usuários",   icon: "👥" },
  { href: "/admin/withdrawals", label: "Saques",     icon: "💸" },
  { href: "/admin/afiliados",   label: "Afiliados",  icon: "🤝" },
  { href: "/admin/tickets",     label: "Suporte",    icon: "🎫" },
  { href: "/admin/fraud",       label: "Fraudes",    icon: "🔍" },
  { href: "/admin/audit",       label: "Auditoria",  icon: "📋" },
  { href: "/admin/settings",    label: "Config",     icon: "⚙️"  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
  }

  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#0a0612] flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-[#0d0a1a] border-r border-[#1e1532] flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#1e1532]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-violet-600 rounded-lg flex items-center justify-center">
              <span className="text-[#080c14] font-black text-[10px]">ADM</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">Prime Broker</p>
              <p className="text-violet-400 text-[10px]">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                    : "text-slate-400 hover:text-slate-100 hover:bg-white/4"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-[#1e1532]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all w-full"
          >
            <span>🚪</span> Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
