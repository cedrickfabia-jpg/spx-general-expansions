"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ClipboardList, LayoutDashboard, LogOut, Settings, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/requests", label: "My Requests", icon: ClipboardList },
  { href: "/approvals", label: "My Approvals", icon: ShieldCheck },
  { href: "/notifications", label: "Notifications", icon: Bell }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOutUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user?.roles.includes("ADMINISTRATOR") ?? false;

  async function logout() {
    await signOutUser();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b border-border bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">ND</span>
              SPX NetDev
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                    pathname.startsWith(item.href) && "bg-muted text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
              {isAdmin ? (
                <Link href="/admin" className={cn("flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground", pathname.startsWith("/admin") && "bg-muted text-foreground")}>
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  Admin
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:block">{user?.name}</span>
            <button type="button" onClick={logout} className="flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
