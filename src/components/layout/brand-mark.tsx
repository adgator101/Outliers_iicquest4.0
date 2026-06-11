import { cn } from "@/lib/utils";

/**
 * Double-pennant mark — echo of Nepal's flag, the only non-rectangular
 * national flag. Upper pennant in Simrik crimson, lower in Nilo slate.
 */
export function PennantMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <path d="M5 1.5 L17.5 7 L5 12.5 Z" fill="var(--simrik)" />
      <path d="M5 10.5 L20.5 16.5 L5 22.5 Z" fill="var(--nilo)" />
    </svg>
  );
}

export function BrandMark({
  className,
  markClassName,
  inverted = false,
  subtitle = "Nepal",
}: {
  className?: string;
  markClassName?: string;
  /** For dark/Nilo surfaces — renders both pennants light. */
  inverted?: boolean;
  subtitle?: string | null;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      {inverted ? (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={cn("shrink-0", markClassName ?? "size-5")}
        >
          <path d="M5 1.5 L17.5 7 L5 12.5 Z" fill="var(--simrik)" />
          <path d="M5 10.5 L20.5 16.5 L5 22.5 Z" fill="#faf9f7" />
        </svg>
      ) : (
        <PennantMark className={markClassName ?? "size-5"} />
      )}
      <span className="flex items-baseline gap-1.5">
        <span className="font-heading text-lg font-semibold leading-none tracking-tight">
          CivicChain
        </span>
        {subtitle ? (
          <span
            className={cn(
              "font-heading text-xs font-medium uppercase tracking-[0.18em]",
              inverted ? "text-white/60" : "text-muted-foreground"
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
