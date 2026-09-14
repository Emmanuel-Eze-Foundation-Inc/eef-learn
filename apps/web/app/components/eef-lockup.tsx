import { EefBadge } from "./eef-badge";

/** Figma Lockup / EEF Horizontal (full) and Lockup / EEF Short. */
export function EefLockup({
  variant = "full",
  className,
}: {
  variant?: "full" | "short";
  className?: string;
}) {
  if (variant === "short") {
    return (
      <span className={`flex items-center gap-3 ${className ?? ""}`}>
        <EefBadge className="h-9 w-9 shrink-0" />
        <span className="text-[22px] font-semibold leading-none tracking-tight">EEF</span>
      </span>
    );
  }

  return (
    <span className={`flex items-center gap-3.5 ${className ?? ""}`}>
      <EefBadge className="h-11 w-11 shrink-0" />
      <span className="flex min-w-0 flex-col">
        <span className="text-[17px] font-semibold leading-tight tracking-tight">Emmanuel Eze</span>
        <span className="font-mono text-[11px] uppercase leading-none tracking-[0.08em] text-star-400">
          Foundation
        </span>
      </span>
    </span>
  );
}
