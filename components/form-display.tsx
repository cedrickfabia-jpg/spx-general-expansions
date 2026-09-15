import type { Hub } from "@/features/hod-approvals/types";
import { FORM_FIELDS } from "@/features/hod-approvals/forms/fields";

const fieldsByKey = new Map<string, (typeof FORM_FIELDS)[number]>(FORM_FIELDS.map((field) => [field.key, field]));
const sectionOrder = Array.from(new Set(FORM_FIELDS.map((field) => field.section)));

export function FormDisplay({
  data,
  hub
}: {
  data: Record<string, unknown>;
  hub: Hub | null;
}) {
  const grouped: Record<string, Array<{ label: string; value: string }>> = {};
  for (const key of Object.keys(data)) {
    const field = fieldsByKey.get(key);
    if (!field) continue;
    const value = data[key];
    if (typeof value !== "string" || value.trim() === "") continue;
    if (!grouped[field.section]) grouped[field.section] = [];
    grouped[field.section].push({ label: field.label, value });
  }

  return (
    <div className="grid gap-6">
      {sectionOrder.map((section) => {
        const fields = grouped[section] ?? [];
        if (fields.length === 0) return null;
        return (
          <div key={section} className="surface p-5">
            <p className="section-title">{section}</p>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.label}>
                  <dt className="text-xs text-muted-foreground">{field.label}</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-sm font-medium">{field.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
