import type { Priority } from "@/generated/prisma/client";

/**
 * Priority colors for map layers (Mapbox can't read CSS variables).
 * Keep in sync with --priority-* tokens in src/app/globals.css.
 */
export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: "#64748b",
  MEDIUM: "#2563eb",
  HIGH: "#d97706",
  CRITICAL: "#dc2626",
};

export const PRIORITY_ORDER: Priority[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
];
