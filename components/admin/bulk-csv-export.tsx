"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BulkCsvItem {
  id: string;
  requestNumber: string | null;
  title: string;
}

export function BulkCsvExport({ items }: { items: BulkCsvItem[] }) {
  const [selected, setSelected] = React.useState<string[]>([]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  const allSelected = items.length > 0 && selected.length === items.length;
  const exportHref = selected.length > 0
    ? `/api/admin/history/export?ids=${encodeURIComponent(selected.join(","))}`
    : undefined;

  return (
    <div className="surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-title">Bulk CSV Export</p>
          <p className="mt-1 text-sm text-muted-foreground">Select requests from the current page, then download them as CSV.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelected(allSelected ? [] : items.map((item) => item.id))}>
            {allSelected ? "Clear Selection" : "Select All"}
          </Button>
          <a href={exportHref} className={exportHref ? undefined : "pointer-events-none opacity-50"}>
            <Button variant="secondary" size="sm" disabled={!exportHref}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Download Selected CSV
            </Button>
          </a>
        </div>
      </div>
      <div className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-md border border-border p-2">
        {items.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">No requests on this page.</p>
        ) : null}
        {items.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
            <input type="checkbox" className="mt-0.5" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{item.requestNumber ?? "Draft"}</span>
              <span className="block truncate text-xs text-muted-foreground">{item.title}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
