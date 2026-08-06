"use client";

import { cn } from "@skolara/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { NAV_ITEMS } from "./nav-items";

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const groups = useMemo(() => {
    if (!user) return [];
    const visible = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
    const byGroup = new Map<string, typeof visible>();
    for (const item of visible) {
      const list = byGroup.get(item.group) ?? [];
      list.push(item);
      byGroup.set(item.group, list);
    }
    return Array.from(byGroup.entries());
  }, [user]);

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-5 dark:border-slate-800">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-sm font-bold text-white shadow-glow">
            S
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Skolara
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map(([group, items]) => (
          <div key={group} className="mb-5">
            <p className="mb-1.5 px-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {group}
            </p>
            <div className="flex flex-col gap-0.5">
              {items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-xl px-2.5 py-2 text-sm font-medium transition-all",
                      active
                        ? "bg-brand-gradient text-white shadow-glow"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {user && (
        <div className="flex items-center gap-3 border-t border-slate-200 px-4 py-4 dark:border-slate-800">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral-gradient text-xs font-bold text-white">
            {initials(user.firstName, user.lastName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-700 dark:hover:bg-slate-800 dark:hover:text-brand-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      )}
    </aside>
  );
}
