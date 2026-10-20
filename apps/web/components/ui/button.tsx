import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-aurora-400/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-aurora-400 text-ink-900 hover:bg-aurora-600",
        outline:
          "border border-night-800 bg-transparent text-star-100 hover:border-star-400",
        secondary: "border border-night-800 bg-night-900 text-star-100 hover:border-star-400",
        ghost: "text-star-400 hover:text-star-100",
        link: "rounded-none text-aurora-400 underline-offset-4 hover:underline",
        destructive: "border border-ember-500/40 text-ember-300 hover:border-ember-500",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        sm: "h-8 px-3.5 text-[0.8rem]",
        lg: "h-11 px-6",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-xs": "size-6",
        "icon-lg": "size-11",
        xs: "h-7 px-2.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
