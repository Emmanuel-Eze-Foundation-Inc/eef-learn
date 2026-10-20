import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-2xl border border-night-800 bg-night-900 px-4 text-sm text-star-100 outline-none placeholder:text-star-400 focus-visible:border-aurora-400 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
