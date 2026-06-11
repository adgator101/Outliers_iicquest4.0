import { generateJSON } from "@/lib/gemini";

export type CascadeCandidate = {
  id: string;
  title: string;
  category: string;
  distanceMeters: number;
  ageDays: number;
};

export type CascadeDetectionResult = {
  upstreamIssueId: string;
  reasoning: string;
  confidence: number; // 0–1; stored internally — never shown as % in UI
} | null;

// Ask Gemini whether a newly created issue is a downstream causal effect of any
// nearby existing open issues. Handles arbitrary chains (dam breach → flooding →
// garbage → standing water → mosquito risk) that no static category table could
// enumerate.
//
// Returns null if no plausible causal link is found, or if the AI call fails.
export async function detectCascadeWithAI(
  newIssue: { title: string; description: string; category: string },
  candidates: CascadeCandidate[]
): Promise<CascadeDetectionResult> {
  if (candidates.length === 0) return null;

  const candidateList = candidates
    .map(
      (c) =>
        `- ID: ${c.id} | Category: ${c.category} | Title: "${c.title}" | ${c.distanceMeters}m away | ${c.ageDays} days old`
    )
    .join("\n");

  const prompt = `You are a civic infrastructure analyst for CivicChain Nepal.

A new civic issue has just been reported:
- Category: ${newIssue.category}
- Title: "${newIssue.title}"
- Description: "${newIssue.description.slice(0, 300)}"

Nearby open issues (within 500m, under 14 days old):
${candidateList}

Civic infrastructure problems often cause chain reactions. Examples:
- Blocked drain → road flooding, standing water, garbage accumulation, mosquito risk
- Dam or embankment breach → flooding, road damage, displacement, contamination
- Garbage accumulation → environmental hazard, drainage blockage, health/safety risk
- Power line failure → public safety, road hazard

Return ONLY valid JSON with this exact structure:
{
  "upstreamIssueId": "the issue ID from the list that most plausibly CAUSED this new issue, or null",
  "reasoning": "one sentence explanation of the causal link, or null",
  "confidence": 0.0
}

Rules:
- upstreamIssueId must be an ID from the candidate list, or null
- Only return an ID if confidence > 0.55 — be conservative
- Closer issues (lower distanceMeters) and more recent ones (lower ageDays) should increase confidence
- Return null if the new issue is unrelated to all candidates`;

  try {
    const raw = await generateJSON<{
      upstreamIssueId: string | null;
      reasoning: string | null;
      confidence: number;
    }>(prompt);

    if (
      !raw.upstreamIssueId ||
      typeof raw.upstreamIssueId !== "string" ||
      raw.confidence < 0.55
    ) {
      return null;
    }

    // Validate the returned ID is actually in our candidate list.
    if (!candidates.some((c) => c.id === raw.upstreamIssueId)) return null;

    return {
      upstreamIssueId: raw.upstreamIssueId,
      reasoning: raw.reasoning ?? "",
      confidence: raw.confidence,
    };
  } catch {
    return null; // Any failure → caller uses the fallback
  }
}
