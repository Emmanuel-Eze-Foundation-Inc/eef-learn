import { cn } from "@/lib/utils";

export const FIELD_LABEL = "text-sm font-medium";
export const FIELD_HINT = "text-xs text-star-400";

export function SettingsSection({
  id,
  title,
  description,
  danger = false,
  children,
}: {
  id: string;
  title: string;
  description?: React.ReactNode;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        "scroll-mt-24 rounded-2xl border bg-night-900/40 p-5 sm:p-6",
        danger ? "border-ember-500/30" : "border-night-800",
      )}
    >
      <h3 id={`${id}-title`} className={cn("text-base font-semibold", danger && "text-ember-300")}>
        {title}
      </h3>
      {description ? <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-star-400">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Field({
  id,
  label,
  hint,
  count,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  count?: { value: number; max: number };
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={FIELD_LABEL}>
          {label}
        </label>
        {count ? (
          <span className={cn(FIELD_HINT, "tabular-nums", count.value > count.max && "text-ember-300")}>
            {count.value}/{count.max}
          </span>
        ) : null}
      </div>
      {children}
      {hint ? <p className={FIELD_HINT}>{hint}</p> : null}
    </div>
  );
}
