import { generateJSON } from "@/lib/gemini";
import type { CreateReportInput } from "@/lib/validations/report";
import type { ReportAIAnalysis } from "@/types";

type NearbyIssue = {
  id: string;
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
};

export async function analyzeReport(
  report: CreateReportInput,
  nearbyIssues: NearbyIssue[]
): Promise<ReportAIAnalysis> {
  const nearbyIssuesText =
    nearbyIssues.length > 0
      ? nearbyIssues
          .map(
            (i) =>
              `- ID: ${i.id} | Title: "${i.title}" | Category: ${i.category} | Description: "${i.description.slice(0, 200)}"`
          )
          .join("\n")
      : "None";

  const prompt = `You are a civic issue analysis system for CivicChain Nepal.

Analyze the following citizen report and return a JSON response.

Report:
- Title: "${report.title}"
- Description: "${report.description}"
- Provided category: "${report.category}"
- Ward: ${report.wardNumber ?? "unknown"}, Municipality: ${report.municipalityName ?? "unknown"}

Nearby active issues in the same area (within 500m / same ward):
${nearbyIssuesText}

Return ONLY valid JSON matching this exact structure (no extra text):
{
  "category": "INFRASTRUCTURE|WATER_SANITATION|WASTE_MANAGEMENT|ELECTRICITY|ROAD|ENVIRONMENT|PUBLIC_SAFETY|OTHER",
  "priority": "LOW|MEDIUM|HIGH|CRITICAL",
  "priorityReason": "one sentence explaining the priority",
  "duplicateIssueId": "exact issue id from the nearby list, or null if no duplicate",
  "duplicateConfidence": 0.0,
  "duplicateReason": "why this is a duplicate, or null",
  "rootCauseSuggestion": "short title for potential root cause (max 60 chars), or null if not apparent",
  "rootCauseReason": "2-3 sentence explanation of the root cause pattern, or null",
  "rootCauseConfidence": 0.0
}

Rules:
- duplicateIssueId must be one of the IDs from the nearby list, or null
- duplicateConfidence: 0.0 if no duplicate, up to 1.0 for very strong match
- rootCauseConfidence: 0.0 if no root cause detected, up to 1.0
- Only suggest root cause if confidence > 0.6`;

  try {
    const result = await generateJSON<ReportAIAnalysis>(prompt);
    return result;
  } catch {
    // Fallback if AI fails — return safe defaults
    return {
      category: report.category as ReportAIAnalysis["category"],
      priority: "MEDIUM",
      priorityReason: "Default priority assigned",
      duplicateIssueId: null,
      duplicateConfidence: 0,
      duplicateReason: null,
      rootCauseSuggestion: null,
      rootCauseReason: null,
      rootCauseConfidence: 0,
    };
  }
}
