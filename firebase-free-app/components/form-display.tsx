import { FORM_FIELDS } from "@/features/hod-approvals/forms/fields";

export function FormDisplay({ data }: { data: Record<string, unknown> }) {
  const sections = [...new Set(FORM_FIELDS.map((field) => field.section))];
  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const fields = FORM_FIELDS.filter((field) => field.section === section && data[field.key] !== undefined && String(data[field.key]).trim() !== "");
        if (fields.length === 0) return null;
        return (
          <section key={section}>
            <h3 className="border-b border-border pb-2 text-sm font-semibold uppercase tracking-wide text-primary">{section}</h3>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.key}>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">{field.label}</dt>
                  <dd className="mt-1 text-sm text-foreground">{String(data[field.key])}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
