import { generateJSON } from "@/lib/gemini";
import type { RootCauseAIAnalysis } from "@/types";

type IssueForAnalysis = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  wardNumber: number | null;
  municipalityName: string | null;
};

type ExistingRootIssue = {
  id: string;
  title: string;
  description: string;
};

export async function analyzeRootCauses(
  issues: IssueForAnalysis[],
  existingRootIssues: ExistingRootIssue[]
): Promise<RootCauseAIAnalysis> {
  const issuesText = issues
    .map(
      (i) =>
        `- ID: ${i.id} | Title: "${i.title}" | Category: ${i.category} | Status: ${i.status} | Description: "${i.description.slice(0, 300)}"`
    )
    .join("\n");

  const existingText =
    existingRootIssues.length > 0
      ? existingRootIssues
          .map((r) => `- "${r.title}": ${r.description.slice(0, 150)}`)
          .join("\n")
      : "None";

  const prompt = `You are a civic root cause analysis system for CivicChain Nepal.

The following civic issues have been reported in the same area. Analyze whether they share a common systemic root cause.

Issues:
${issuesText}

Existing root issues already identified in this area (do not duplicate these):
${existingText}

Return ONLY valid JSON matching this exact structure (no extra text):
{
  "hasRootCause": true | false,
  "rootCauseTitle": "concise title (max 60 chars) or null",
  "rootCauseDescription": "2-3 sentence explanation of the systemic cause or null",
  "rootCauseCategory": "INFRASTRUCTURE|WATER_SANITATION|WASTE_MANAGEMENT|ELECTRICITY|ROAD|ENVIRONMENT|PUBLIC_SAFETY|OTHER or null",
  "confidence": 0.0,
  "relatedIssueIds": ["id1", "id2"],
  "reasoning": "explain the pattern you detected across the issues"
}

Rules:
- Set hasRootCause: true only if confidence > 0.6
- relatedIssueIds must only contain IDs from the input issues list
- Do not suggest a root cause that matches an existing root issue title
- rootCauseCategory should represent the primary underlying system that failed`;

  try {
    const result = await generateJSON<RootCauseAIAnalysis>(prompt);
    return result;
  } catch {
    return {
      hasRootCause: false,
      rootCauseTitle: null,
      rootCauseDescription: null,
      rootCauseCategory: null,
      confidence: 0,
      relatedIssueIds: [],
      reasoning: "Analysis unavailable",
    };
  }
}
