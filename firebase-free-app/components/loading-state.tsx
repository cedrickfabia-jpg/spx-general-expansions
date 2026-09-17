export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" aria-hidden="true" />
        {label}
      </div>
    </div>
  );
}
