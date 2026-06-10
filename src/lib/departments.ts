// Palika sections (shakha) and how citizen-facing issue categories map onto them.
// Client-safe: only enum values and plain lookup tables, no server imports.
import { Category, Department } from "@/generated/prisma/client";

// Which section owns which category. Used by STORY-008 to route assignment.
export const CATEGORY_TO_DEPARTMENT: Record<Category, Department> = {
  ROAD: "TECHNICAL_INFRASTRUCTURE",
  INFRASTRUCTURE: "TECHNICAL_INFRASTRUCTURE",
  WATER_SANITATION: "WATER_SANITATION",
  WASTE_MANAGEMENT: "ENVIRONMENT_WASTE",
  ENVIRONMENT: "ENVIRONMENT_WASTE",
  ELECTRICITY: "ELECTRICITY_LIGHTING",
  PUBLIC_SAFETY: "DISASTER_PUBLIC_SAFETY",
  OTHER: "ADMINISTRATION",
};

export function categoryToDepartment(category: Category): Department {
  return CATEGORY_TO_DEPARTMENT[category];
}

// All categories owned by a section — used to build a section head's queue.
export function categoriesForDepartment(department: Department): Category[] {
  return (Object.keys(CATEGORY_TO_DEPARTMENT) as Category[]).filter(
    (c) => CATEGORY_TO_DEPARTMENT[c] === department
  );
}

export const DEPARTMENT_LABELS: Record<Department, string> = {
  TECHNICAL_INFRASTRUCTURE: "Technical / Infrastructure",
  WATER_SANITATION: "Water Supply & Sanitation",
  ENVIRONMENT_WASTE: "Environment & Waste Management",
  ELECTRICITY_LIGHTING: "Electricity & Street Lighting",
  DISASTER_PUBLIC_SAFETY: "Disaster & Public Safety",
  ADMINISTRATION: "Administration (General)",
};

// Short labels for tight spaces (badges, table cells).
export const DEPARTMENT_SHORT_LABELS: Record<Department, string> = {
  TECHNICAL_INFRASTRUCTURE: "Technical",
  WATER_SANITATION: "Water & Sanitation",
  ENVIRONMENT_WASTE: "Environment & Waste",
  ELECTRICITY_LIGHTING: "Electricity",
  DISASTER_PUBLIC_SAFETY: "Public Safety",
  ADMINISTRATION: "Administration",
};

// Consistent semantic colour per section. The same hue follows a section across
// the team roster, the assignment picker (STORY-008), and anywhere else it shows,
// so the section becomes recognisable at a glance — not decoration, a wayfinding cue.
export const DEPARTMENT_BADGE_CLASSES: Record<Department, string> = {
  TECHNICAL_INFRASTRUCTURE:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  WATER_SANITATION:
    "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  ENVIRONMENT_WASTE:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  ELECTRICITY_LIGHTING:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  DISASTER_PUBLIC_SAFETY:
    "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  ADMINISTRATION:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export const DEPARTMENT_OPTIONS: Department[] = [
  "TECHNICAL_INFRASTRUCTURE",
  "WATER_SANITATION",
  "ENVIRONMENT_WASTE",
  "ELECTRICITY_LIGHTING",
  "DISASTER_PUBLIC_SAFETY",
  "ADMINISTRATION",
];
