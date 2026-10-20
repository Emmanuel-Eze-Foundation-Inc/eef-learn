import { cn } from "@/lib/utils";

/** The 2023 EEF mark sits on white in both themes; its dark purple disappears on night. */
function EefMark({ className }: { className?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-[12px] bg-white ring-1 ring-black/5", className)}>
      <img src="/brand/eef-mark.png" alt="" width={512} height={347} className="w-[78%]" />
    </span>
  );
}

export function EefLockup({
  variant = "full",
  className,
}: {
  variant?: "full" | "short";
  className?: string;
}) {
  if (variant === "short") {
    return (
      <span className={cn("flex items-center", className)}>
        <EefMark className="size-11" />
      </span>
    );
  }

  return (
    <span className={cn("flex items-center gap-3.5", className)}>
      <EefMark className="size-12" />
      <span className="flex min-w-0 flex-col">
        <span className="text-[17px] leading-tight font-semibold tracking-tight">Emmanuel Eze</span>
        <span className="font-mono text-[11px] leading-none tracking-[0.08em] text-star-400 uppercase">
          Foundation
        </span>
      </span>
    </span>
  );
}
