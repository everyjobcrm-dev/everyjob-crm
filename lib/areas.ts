import { z } from "zod";

/** Fixed region list. Mirrors the CHECK constraints profiles_region_check / events_region_check (D1 migration). */
export const REGIONS = ["צפון", "חיפה והקריות", "שרון", "מרכז", "ירושלים", "שפלה", "דרום"] as const;
export type Region = (typeof REGIONS)[number];

export function isRegion(value: unknown): value is Region {
  return typeof value === "string" && (REGIONS as readonly string[]).includes(value);
}

/** Role tags offered in the UI (profiles.role_tags is free text[] in the DB). Same spelling as event_roles.role_name. */
export const ROLE_TAGS = ["מלצר/ית", "ברמן/ית", "סדרן/ית", "מארח/ת", "קופאי/ת", "טבח/ית", "מאבטח/ת"] as const;

/** Server-side validation of an area edit (own profile or staff edit). */
export const areaSchema = z.object({
  city: z.string().trim().max(80, "שם העיר ארוך מדי"),
  region: z.union([z.enum(REGIONS), z.literal("")]),
  roleTags: z.array(z.enum(ROLE_TAGS)).max(20),
});
export type AreaInput = z.input<typeof areaSchema>;
