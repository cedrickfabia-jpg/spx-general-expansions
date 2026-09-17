import { Button } from "@/components/ui/button";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry ? <Button className="mt-4" variant="secondary" onClick={onRetry}>Try again</Button> : null}
    </div>
  );
}
