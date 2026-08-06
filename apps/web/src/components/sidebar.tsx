"use client";

import { cn } from "@skolara/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { NAV_ITEMS } from "./nav-items";

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
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
        <Link href="/" className="text-lg font-semibold text-brand-700">
          Skolara
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map(([group, items]) => (
          <div key={group} className="mb-5">
            <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
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
                      "rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
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
        <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
            {user.firstName} {user.lastName}
          </p>
          <p className="truncate text-xs text-slate-400">{user.email}</p>
          <button
            onClick={logout}
            className="mt-2 text-xs font-medium text-brand-700 hover:underline"
          >
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
