import { cn } from "@/lib/utils";

/** Framed night panel — rails, ticks, and a hatch band. Used across Learn and Foundation. */
export function NightFrame({
  children,
  className,
  hatch = false,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  hatch?: boolean;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border border-night-800 bg-night-900 text-star-100",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 top-3 h-px bg-linear-to-r from-transparent via-aurora-400/50 to-transparent"
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-4 left-3 w-px bg-star-100/10" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-4 right-3 w-px bg-star-100/10" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 bottom-3 h-px bg-star-100/10"
      />
      {hatch ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-8 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, transparent, transparent 6px, color-mix(in oklab, var(--aurora-400) 18%, transparent) 6px, color-mix(in oklab, var(--aurora-400) 18%, transparent) 7px)",
          }}
        />
      ) : null}
      <div className={cn("relative", padded && "p-6 sm:p-8")}>{children}</div>
    </div>
  );
}
