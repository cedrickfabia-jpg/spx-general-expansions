"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ClipboardCheck,
  Eye,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
  Workflow
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { listNotifications } from "@/lib/data";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  watcherOnly?: boolean;
}

const workflowNav: NavItem[] = [
  { href: "/requests", label: "My Requests", icon: FileText },
  { href: "/approvals", label: "My Approvals", icon: ClipboardCheck },
  { href: "/approvals/my-watches", label: "My Watches", icon: Eye, watcherOnly: true },
  { href: "/approvals/all", label: "All Requests", icon: Search, adminOnly: true },
  { href: "/notifications", label: "Notifications", icon: Bell }
];

function NavLinks({
  unreadCount,
  isAdmin,
  isWatcher,
  onNavigate
}: {
  unreadCount: number;
  isAdmin: boolean;
  isWatcher: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = [
    ...workflowNav.filter((item) => (!item.adminOnly || isAdmin) && (!item.watcherOnly || isWatcher)),
    { href: "/admin", label: "Administration", icon: Settings, adminOnly: true }
  ].filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon ?? LayoutDashboard;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{item.label}</span>
            {item.href === "/notifications" && unreadCount > 0 ? (
              <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">{unreadCount}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOutUser } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [workflowMenuOpen, setWorkflowMenuOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/dashboard";

  React.useEffect(() => {
    if (!user) return;
    listNotifications(user.id).then((items) => setUnreadCount(items.filter((item) => !item.read).length)).catch(console.error);
  }, [user]);

  const isAdmin = user?.roles.includes("ADMINISTRATOR") ?? false;
  const isWatcher = user?.roles.includes("WATCHER") ?? false;

  async function logout() {
    await signOutUser();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-black/10 bg-primary text-primary-foreground shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
          <div className="relative flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="rounded-md p-2 text-white/80 hover:bg-white/10"
              onClick={() => setWorkflowMenuOpen((open) => !open)}
              aria-label="Open workflows"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-2 truncate">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/15 text-sm font-bold text-white">ND</span>
              <span className="hidden min-w-0 flex-col sm:flex">
                <span className="truncate text-sm font-semibold leading-tight text-primary-foreground">SPX NetDev</span>
                <span className="text-[11px] leading-tight text-white/70">Workflows</span>
              </span>
            </Link>
            {workflowMenuOpen ? (
              <div className="absolute left-0 top-12 z-40 w-64 rounded-lg border border-border bg-white p-2 shadow-lg">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Workflows</p>
                <Link
                  href="/workflows/hod-approval"
                  onClick={() => setWorkflowMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground",
                    pathname.startsWith("/workflows/hod-approval") ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  )}
                >
                  <Workflow className="h-4 w-4" aria-hidden="true" />
                  HOD Approval
                </Link>
                <button
                  type="button"
                  onClick={() => { setWorkflowMenuOpen(false); void logout(); }}
                  className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>

          {!isHome ? (
          <div className="flex items-center gap-2">
            <Link href="/profile" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/10" title="Profile">
              <span className="hidden text-right sm:block">
                <span className="block max-w-[160px] truncate text-sm font-medium leading-tight text-primary-foreground">{user?.name}</span>
                <span className="block max-w-[160px] truncate text-[11px] leading-tight text-white/70">{user?.email}</span>
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <User className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
            <button type="button" className="rounded-md p-2 text-white/80 hover:bg-white/10 md:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 md:inline-flex" onClick={logout}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
          ) : null}
        </div>

        {!isHome ? (
          <div className="mx-auto hidden max-w-7xl px-4 pb-2 md:block">
            <NavLinks unreadCount={unreadCount} isAdmin={isAdmin} isWatcher={isWatcher} />
          </div>
        ) : null}
        {!isHome && menuOpen ? (
          <div className="border-t border-border bg-white px-4 py-3 md:hidden">
            <NavLinks unreadCount={unreadCount} isAdmin={isAdmin} isWatcher={isWatcher} onNavigate={() => setMenuOpen(false)} />
            <button type="button" className="mt-3 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground" onClick={logout}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Logout
            </button>
          </div>
        ) : null}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">{children}</main>
      <footer className="border-t border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground">
          <span>© 2026 SPX Network Development App</span>
          <span>SPX Network Development Workflows</span>
        </div>
      </footer>
    </div>
  );
}
