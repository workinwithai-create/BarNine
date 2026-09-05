import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-2 py-0.5 font-mono text-xs uppercase tracking-wider",
  {
    variants: {
      variant: {
        default: "bg-surface-2 text-muted",
        accent: "bg-accent text-accent-fg",
        risk: "bg-danger/15 text-danger",
        warn: "bg-warn/15 text-warn",
        ok: "bg-accent/15 text-accent",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
