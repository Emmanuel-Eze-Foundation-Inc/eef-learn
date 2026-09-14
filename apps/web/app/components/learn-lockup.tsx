import { WaypathMark } from "./waypath-mark";

/** Figma Lockup / Learn Horizontal and Lockup / Learn Foundation. */
export function LearnLockup({
  variant = "product",
  className,
}: {
  variant?: "product" | "foundation";
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-3.5 ${className ?? ""}`}>
      <WaypathMark className="h-10 w-10 shrink-0 sm:h-11 sm:w-11" />
      {variant === "foundation" ? (
        <span className="flex min-w-0 flex-col">
          <span className="text-lg font-semibold leading-tight tracking-tight">EEF Learn</span>
          <span className="font-mono text-[10px] uppercase leading-none tracking-[0.08em] text-star-400">
            By Emmanuel Eze Foundation
          </span>
        </span>
      ) : (
        <span className="text-lg font-semibold leading-none tracking-tight">EEF Learn</span>
      )}
    </span>
  );
}
