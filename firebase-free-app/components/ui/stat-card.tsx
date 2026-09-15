import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  tone = "default",
  icon
}: {
  label: string;
  value: number | string;
  tone?: "default" | "success" | "warning" | "danger" | "muted";
  icon?: React.ReactNode;
}) {
  const tones = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-accent-foreground",
    danger: "text-destructive",
    muted: "text-muted-foreground"
  };
  return (
    <div className="surface flex items-center gap-3 p-4">
      {icon ? <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">{icon}</div> : null}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className={cn("text-2xl font-semibold leading-tight tabular-nums", tones[tone])}>{value}</p>
      </div>
    </div>
  );
}
