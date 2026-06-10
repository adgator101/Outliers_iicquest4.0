import type {
  User,
  Report,
  Issue,
  IssueUpdate,
  IssueVerification,
  RootIssue,
  Role,
  IssueStatus,
  ReportStatus,
  Priority,
  Category,
  VerificationType,
  RootIssueStatus,
} from "@/generated/prisma/client";

export type {
  User,
  Report,
  Issue,
  IssueUpdate,
  IssueVerification,
  RootIssue,
  Role,
  IssueStatus,
  ReportStatus,
  Priority,
  Category,
  VerificationType,
  RootIssueStatus,
};

// Issue with common relations pre-loaded
export type IssueWithRelations = Issue & {
  reports: Report[];
  updates: (IssueUpdate & { author: Pick<User, "id" | "name" | "image"> })[];
  assignedTo: Pick<User, "id" | "name" | "image" | "municipalityName"> | null;
  rootIssue: RootIssue | null;
  _count: { reports: number };
};

export type ReportWithUser = Report & {
  user: Pick<User, "id" | "name" | "image">;
};

// AI analysis result from Gemini (report analysis)
export type ReportAIAnalysis = {
  category: Category;
  priority: Priority;
  priorityReason: string;
  duplicateIssueId: string | null;
  duplicateConfidence: number;
  duplicateReason: string | null;
  rootCauseSuggestion: string | null;
  rootCauseReason: string | null;
  rootCauseConfidence: number;
};

// AI root cause analysis result
export type RootCauseAIAnalysis = {
  hasRootCause: boolean;
  rootCauseTitle: string | null;
  rootCauseDescription: string | null;
  rootCauseCategory: Category | null;
  confidence: number;
  relatedIssueIds: string[];
  reasoning: string;
};

// Attention status computed on the fly — factual age in current status, no SLA.
export type AttentionStatus = {
  flagged: boolean;
  daysInStatus: number;
  reason: string;
  limit: number;
};

// Result of the report-submission clustering pipeline (geo → semantic → impact).
export type ClusterResult =
  | {
      outcome: "attached_geospatial" | "attached_semantic";
      reportId: string;
      issueId: string;
      issueTitle: string;
      reportCount: number;
      communityImpactScore: number;
      priority: Priority;
    }
  | {
      outcome: "created";
      reportId: string;
      issueId: string;
      issueTitle: string;
    }
  | {
      outcome: "needs_decision";
      candidate: {
        id: string;
        title: string;
        description: string;
        reportCount: number;
        communityImpactScore: number;
      };
      similarity: number;
      reason: string | null;
    };
