"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/staff", label: "Staff", icon: "🗓️" },
  { href: "/horses", label: "Horses", icon: "🐴" },
  { href: "/competitions", label: "Events", icon: "🏆" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin
    ? [...NAV_ITEMS, { href: "/admin/users", label: "Staff Accounts", icon: "⚙️" }]
    : NAV_ITEMS;
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
            isActive(pathname, item.href)
              ? "bg-emerald-700 text-white"
              : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-neutral-800"
          }`}
        >
          <span aria-hidden>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-stone-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden dark:border-neutral-800 dark:bg-neutral-900/95">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
            isActive(pathname, item.href)
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-stone-500 dark:text-stone-400"
          }`}
        >
          <span className="text-lg" aria-hidden>
            {item.icon}
          </span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
