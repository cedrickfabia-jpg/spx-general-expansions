import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  basePath,
  query
}: {
  page: number;
  totalPages: number;
  basePath: string;
  query: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;
  function href(nextPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
    params.set("page", String(nextPage));
    return `${basePath}?${params.toString()}`;
  }
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Link href={href(Math.max(1, page - 1))} className={cn(page <= 1 && "pointer-events-none opacity-50")}>
          <Button variant="outline" size="sm">Previous</Button>
        </Link>
        <Link href={href(Math.min(totalPages, page + 1))} className={cn(page >= totalPages && "pointer-events-none opacity-50")}>
          <Button variant="outline" size="sm">Next</Button>
        </Link>
      </div>
    </div>
  );
}
