import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { IssueStatus, Priority, Category } from "@/generated/prisma/enums";
import type { AttentionStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Geospatial: haversine distance in meters ────────────────────────────────
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6_371_000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Community Impact Score + priority auto-elevation ─────────────────────────
// Thresholds (per civicchain.mdc): 1→0.3, 3→0.6, 8→0.88 (HIGH), 15+→0.98 (CRITICAL).
// Priority auto-elevation here is PURE ARITHMETIC — the only allowed automatic
// priority change. It never lowers an existing higher priority.
export function computeImpact(reportCount: number): {
  score: number;
  priority?: Priority;
} {
  if (reportCount >= 15) return { score: 0.98, priority: "CRITICAL" };
  if (reportCount >= 8) return { score: 0.88, priority: "HIGH" };
  if (reportCount >= 3) return { score: 0.6 };
  return { score: 0.3 };
}

// Rank priorities so auto-elevation never demotes a manually-set higher priority.
const PRIORITY_RANK: Record<Priority, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export function maxPriority(a: Priority, b: Priority): Priority {
  return PRIORITY_RANK[a] >= PRIORITY_RANK[b] ? a : b;
}

// ─── Age-based accountability (honest, descriptive — never a promised fix date) ──
// We do NOT invent SLAs or priority multipliers. We surface how long something has
// gone unaddressed, and flag items that have waited beyond a plain attention
// threshold. These thresholds sort/highlight; they never claim a deadline was missed.
export const ATTENTION_THRESHOLD_DAYS = {
  SUBMITTED: 3, // unverified too long (community / HEAD)
  VERIFIED: 3, // sat unassigned (section head / HEAD)
  ACTIVE: 14, // ASSIGNED / IN_PROGRESS / REOPENED — in an officer's hands
} as const;

export function daysSince(date: Date | string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

// Whole-issue age since first reported.
export function issueAgeDays(createdAt: Date | string): number {
  return daysSince(createdAt);
}

// Days a status is allowed to sit before it's flagged for attention.
export function attentionLimit(status: IssueStatus): number {
  switch (status) {
    case IssueStatus.SUBMITTED:
      return ATTENTION_THRESHOLD_DAYS.SUBMITTED;
    case IssueStatus.VERIFIED:
      return ATTENTION_THRESHOLD_DAYS.VERIFIED;
    case IssueStatus.RESOLVED:
      return Infinity; // resolved issues are not "waiting"
    default:
      return ATTENTION_THRESHOLD_DAYS.ACTIVE;
  }
}

// Factual "needs attention" — based purely on how long the issue has sat in its
// current status. No priority multiplier, no fabricated SLA, no fix-date promise.
export function needsAttention(
  status: IssueStatus,
  updatedAt: Date | string
): AttentionStatus {
  const daysInStatus = daysSince(updatedAt);
  const limit = attentionLimit(status);
  const reason =
    status === IssueStatus.SUBMITTED
      ? "Unverified"
      : status === IssueStatus.VERIFIED
      ? "Unassigned"
      : status === IssueStatus.RESOLVED
      ? "Resolved"
      : "Open";
  return { flagged: daysInStatus > limit, daysInStatus, reason, limit };
}

// A voluntary commitment date set by the HEAD's office — a real human promise,
// tracked factually. The system never fabricates this date.
export function commitmentState(dueDate: Date | string | null): {
  hasCommitment: boolean;
  daysPast: number;
  passed: boolean;
} {
  if (!dueDate) return { hasCommitment: false, daysPast: 0, passed: false };
  const daysPast = daysSince(dueDate);
  return { hasCommitment: true, daysPast: Math.max(0, daysPast), passed: daysPast > 0 };
}

export function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function statusLabel(status: IssueStatus): string {
  const labels: Record<IssueStatus, string> = {
    SUBMITTED: "Submitted",
    VERIFIED: "Verified",
    ASSIGNED: "Assigned",
    IN_PROGRESS: "In Progress",
    RESOLVED: "Resolved",
    REOPENED: "Reopened",
  };
  return labels[status];
}

export function priorityLabel(priority: Priority): string {
  const labels: Record<Priority, string> = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
  };
  return labels[priority];
}

export function categoryLabel(category: Category): string {
  const labels: Record<Category, string> = {
    INFRASTRUCTURE: "Infrastructure",
    WATER_SANITATION: "Water & Sanitation",
    WASTE_MANAGEMENT: "Waste Management",
    ELECTRICITY: "Electricity",
    ROAD: "Road",
    ENVIRONMENT: "Environment",
    PUBLIC_SAFETY: "Public Safety",
    OTHER: "Other",
  };
  return labels[category];
}
