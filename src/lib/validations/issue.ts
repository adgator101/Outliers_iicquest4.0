import { z } from "zod";

export const updateIssueStatusSchema = z.object({
  issueId: z.string().cuid(),
  status: z.enum(["SUBMITTED", "VERIFIED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "REOPENED"]),
  comment: z.string().max(500).optional(),
  images: z.array(z.string()).max(5).default([]),
});

export const assignIssueSchema = z.object({
  issueId: z.string().cuid(),
  assignedToId: z.string(),
  dueDate: z.string().datetime().optional(),
  comment: z.string().max(500).optional(),
});

export const verifyIssueSchema = z.object({
  issueId: z.string().cuid(),
  type: z.enum(["CONFIRM", "DISPUTE"]),
  proofImages: z.array(z.string()).max(3).default([]),
  proofLatitude: z.number().optional(),
  proofLongitude: z.number().optional(),
});

export const createRootIssueSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(10).max(1000),
  category: z.enum([
    "INFRASTRUCTURE",
    "WATER_SANITATION",
    "WASTE_MANAGEMENT",
    "ELECTRICITY",
    "ROAD",
    "ENVIRONMENT",
    "PUBLIC_SAFETY",
    "OTHER",
  ]),
  issueIds: z.array(z.string().cuid()).min(1, "Select at least one issue"),
  municipalityName: z.string().optional(),
  districtName: z.string().optional(),
  provinceName: z.string().optional(),
});

export type UpdateIssueStatusInput = z.infer<typeof updateIssueStatusSchema>;
export type AssignIssueInput = z.infer<typeof assignIssueSchema>;
export type VerifyIssueInput = z.infer<typeof verifyIssueSchema>;
export type CreateRootIssueInput = z.infer<typeof createRootIssueSchema>;
