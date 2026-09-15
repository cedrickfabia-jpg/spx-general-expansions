"use client";

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
import * as React from "react";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/features/hod-approvals/types";
import { getWorkflowByPath, WORKFLOWS, type WorkflowDefinition } from "@/lib/workflows";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  watcherOnly?: boolean;
  badge?: number;
}

const adminNav: NavItem[] = [
  { href: "/admin", label: "Administration", icon: Settings, adminOnly: true }
];

const workflowIconByLabel: Record<string, React.ComponentType<{ className?: string }>> = {
  "My Requests": FileText,
  "My Approvals": ClipboardCheck,
  "My Watches": Eye,
  "All Requests": Search,
  Notifications: Bell
};

function NavLinks({
  user,
  unreadCount,
  activeWorkflow,
  onNavigate
}: {
  user: AppUser;
  unreadCount: number;
  activeWorkflow: WorkflowDefinition | null | undefined;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const workflowItems: NavItem[] = activeWorkflow
    ? activeWorkflow.navItems
        .filter(
          (item) => (!item.adminOnly || user.isAdmin) && (!item.watcherOnly || user.roles.includes("WATCHER"))
        )
        .map((item) => ({
          href: item.href,
          label: item.label,
          adminOnly: item.adminOnly,
          watcherOnly: item.watcherOnly,
          icon: workflowIconByLabel[item.label]
        }))
    : [];
  const items = [...workflowItems, ...adminNav].filter((item) => !item.adminOnly || user.isAdmin);
  if (items.length === 0) return null;
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
              <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                {unreadCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  user,
  unreadCount,
  children
}: {
  user: AppUser;
  unreadCount: number;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [workflowMenuOpen, setWorkflowMenuOpen] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const activeWorkflow = getWorkflowByPath(pathname);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
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
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/15 text-sm font-bold text-white">
                GE
              </span>
              <span className="hidden min-w-0 flex-col sm:flex">
                <span className="truncate text-sm font-semibold leading-tight text-primary-foreground">General Expansions</span>
                <span className="text-[11px] leading-tight text-white/70">Workflows</span>
              </span>
            </Link>
            {workflowMenuOpen ? (
              <div className="absolute left-0 top-12 z-40 w-64 rounded-lg border border-border bg-white p-2 shadow-lg">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Workflows
                </p>
                {WORKFLOWS.map((workflow) => (
                  <Link
                    key={workflow.id}
                    href={workflow.href}
                    onClick={() => setWorkflowMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground",
                      activeWorkflow?.id === workflow.id ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Workflow className="h-4 w-4" aria-hidden="true" />
                    {workflow.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/profile" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/10" title="Profile">
              <span className="hidden text-right sm:block">
                <span className="block max-w-[160px] truncate text-sm font-medium leading-tight text-primary-foreground">{user.name}</span>
                <span className="block max-w-[160px] truncate text-[11px] leading-tight text-white/70">{user.email}</span>
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <User className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
            <button
              type="button"
              className="rounded-md p-2 text-white/80 hover:bg-white/10 md:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button type="button" className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 md:inline-flex" onClick={logout}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
        </div>
        {activeWorkflow ? (
          <div className="mx-auto hidden max-w-7xl px-4 pb-2 md:block">
            <NavLinks user={user} unreadCount={unreadCount} activeWorkflow={activeWorkflow} />
          </div>
        ) : null}
        {menuOpen ? (
          <div className="border-t border-border bg-white px-4 py-3 md:hidden">
            <NavLinks user={user} unreadCount={unreadCount} activeWorkflow={activeWorkflow} onNavigate={() => setMenuOpen(false)} />
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
          <span>© 2026 General Expansions</span>
          <span>SPX Expansions Workflows</span>
        </div>
      </footer>
    </div>
  );
}
