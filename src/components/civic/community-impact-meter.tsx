import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

// Shows the genuine, self-explaining signal — how many citizens are affected —
// with a bar whose fill reflects report-volume bands. No fabricated "% confidence".
export function CommunityImpactMeter({
  score,
  affectedCitizenCount,
  className,
  compact = false,
}: {
  score: number;
  affectedCitizenCount: number;
  className?: string;
  compact?: boolean;
}) {
  // Bar fill/colour from the impact score bands (1→.3, 3→.6, 8→.88, 15+→.98).
  const fill = Math.round(Math.max(score, 0.04) * 100);
  const barColor =
    score >= 0.9
      ? "bg-priority-critical"
      : score >= 0.8
      ? "bg-priority-high"
      : score >= 0.6
      ? "bg-priority-medium"
      : "bg-priority-low/70";

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
          className
        )}
      >
        <Users className="size-3.5" />
        {affectedCitizenCount} affected
      </span>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Users className="size-4 text-muted-foreground" />
          {affectedCitizenCount}{" "}
          {affectedCitizenCount === 1 ? "citizen" : "citizens"} affected
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${fill}%` }}
        />
      </div>
    </div>
  );
}
