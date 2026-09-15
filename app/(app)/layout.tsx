import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth-session";
import { getUnreadNotificationCount } from "@/lib/notifications";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unreadCount = getUnreadNotificationCount(user.id);
  return (
    <AppShell user={user} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}
