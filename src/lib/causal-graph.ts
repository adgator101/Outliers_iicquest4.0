// Static causal graph between complaint categories (STORY-010). Explicit rules,
// not ML — predictable and explainable for the demo. An edge upstream → downstream
// means "an unresolved upstream problem can cause the downstream one".
import { haversineDistance } from "@/lib/utils";
import type { Category } from "@/generated/prisma/client";

const CASCADE_RADIUS_METERS = 500;
const CASCADE_WINDOW_DAYS = 14;
const DEFAULT_CONFIDENCE = 0.7;

// upstream category → possible downstream effects
export const CAUSAL_EDGES: Record<Category, Category[]> = {
  WATER_SANITATION: ["ROAD", "ENVIRONMENT", "PUBLIC_SAFETY"], // blocked drain → flooding, mosquitoes
  ROAD: ["WASTE_MANAGEMENT", "PUBLIC_SAFETY"], // flooding/damage → garbage, accidents
  INFRASTRUCTURE: ["ROAD", "WATER_SANITATION"], // failing infra → road, water
  WASTE_MANAGEMENT: ["ENVIRONMENT", "PUBLIC_SAFETY"], // garbage → environment, health
  ELECTRICITY: ["PUBLIC_SAFETY"], // downed lines → safety
  ENVIRONMENT: ["PUBLIC_SAFETY"], // hazard → safety
  PUBLIC_SAFETY: [], // terminal effect
  OTHER: [],
};

type CascadeCandidate = {
  id: string;
  category: Category;
  latitude: number;
  longitude: number;
  createdAt: Date | string;
  chainRootIssueId: string | null;
};

type NewIssueShape = {
  category: Category;
  latitude: number;
  longitude: number;
  createdAt?: Date | string;
};

// Given a freshly created (downstream) issue and nearby open issues, find the
// best upstream cause: a candidate A within 500m, created within the last 14
// days, whose category lists the new issue's category as a downstream effect.
// Returns the closest such candidate, or null.
export function detectCascadeLink(
  newIssue: NewIssueShape,
  candidates: CascadeCandidate[]
): { upstreamIssueId: string; chainRootIssueId: string; confidence: number } | null {
  const now = newIssue.createdAt ? new Date(newIssue.createdAt).getTime() : Date.now();

  const matches = candidates
    .filter((c) => CAUSAL_EDGES[c.category]?.includes(newIssue.category))
    .filter((c) => {
      const ageDays = (now - new Date(c.createdAt).getTime()) / 86_400_000;
      return ageDays >= 0 && ageDays <= CASCADE_WINDOW_DAYS;
    })
    .map((c) => ({
      candidate: c,
      distance: haversineDistance(
        newIssue.latitude,
        newIssue.longitude,
        c.latitude,
        c.longitude
      ),
    }))
    .filter((m) => m.distance <= CASCADE_RADIUS_METERS)
    .sort((a, b) => a.distance - b.distance);

  const best = matches[0];
  if (!best) return null;

  return {
    upstreamIssueId: best.candidate.id,
    // The new issue joins the upstream's chain (or the upstream becomes the root).
    chainRootIssueId: best.candidate.chainRootIssueId ?? best.candidate.id,
    confidence: DEFAULT_CONFIDENCE,
  };
}
