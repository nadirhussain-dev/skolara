import { z } from "zod";
import { roleSchema, type RoleType } from "./role";

/**
 * Custom roles, without rewriting authorisation.
 *
 * The four built-in roles are baked into every `@Roles` check in the API and
 * into the JWT. Replacing them with a permission system would mean touching
 * every endpoint at once, which is not a chunk of work — it is a rewrite with
 * a large blast radius across code that currently enforces tenancy correctly.
 *
 * So a template does one thing: it **narrows** a role. A user keeps their base
 * role, so every existing check still governs them; a template attached to
 * them additionally requires each request to fall inside a capability list.
 * "Accountant" is SCHOOL_ADMIN minus everything but fees; "Exams officer" is
 * SCHOOL_ADMIN minus everything but academics.
 *
 * Narrowing only, in one direction, is what makes this safe for a school admin
 * to edit: the worst a badly written template can do is lock somebody out.
 */

/**
 * What a request needs, derived from its path and method rather than declared
 * per endpoint: `<resource>:read` for GET, `<resource>:write` for anything
 * else. The same reasoning as the audit interceptor — a new endpoint is
 * covered the moment it exists, instead of whenever somebody remembers to
 * annotate it.
 */
export const CAPABILITY_ACTIONS = ["read", "write"] as const;
export type CapabilityAction = (typeof CAPABILITY_ACTIONS)[number];

/**
 * The resources a template can speak about, grouped for the editor. Taken
 * from the controller base paths; the first path segment of a request is the
 * resource, so this list is the API's own surface rather than a parallel
 * description of it that can drift.
 */
export const CAPABILITY_GROUPS = [
  {
    group: "People",
    resources: ["students", "teachers", "users", "classes"],
  },
  {
    group: "Academics",
    resources: [
      "attendance",
      "grades",
      "exams",
      "assignments",
      "quizzes",
      "study-materials",
      "lessons",
      "timetable",
      "calendar",
      "live-classes",
      "report-cards",
      "certificates",
    ],
  },
  {
    group: "Finance",
    resources: ["invoices", "payments", "bank-statement", "payroll", "reports"],
  },
  {
    group: "Communication",
    resources: ["notices", "messages", "complaints", "meetings", "broadcasts"],
  },
  {
    group: "Operations",
    resources: ["library", "transport", "hostel", "inventory", "leave"],
  },
  {
    group: "Administration",
    resources: ["analytics", "audit-logs", "api-keys", "schools", "support", "export"],
  },
] as const;

export const CAPABILITY_RESOURCES = CAPABILITY_GROUPS.flatMap(
  (group) => group.resources,
) as readonly string[];

/**
 * Resources every signed-in user reaches regardless of template, because
 * locking someone out of them would lock them out of the app itself rather
 * than out of a feature.
 */
export const ALWAYS_ALLOWED_RESOURCES: readonly string[] = [
  "auth",
  "health",
  "devices",
  "uploads",
];

export function capability(resource: string, action: CapabilityAction): string {
  return `${resource}:${action}`;
}

/** Every capability a template could name, for the editor's checkbox grid. */
export const ALL_CAPABILITIES: readonly string[] = CAPABILITY_RESOURCES.flatMap((resource) =>
  CAPABILITY_ACTIONS.map((action) => capability(resource, action)),
);

const capabilitySchema = z.string().refine(
  (value) => (ALL_CAPABILITIES as string[]).includes(value),
  { message: "Unknown capability" },
);

export const roleTemplateSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  name: z.string(),
  baseRole: roleSchema,
  permissions: z.array(z.string()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type RoleTemplate = z.infer<typeof roleTemplateSchema>;

/**
 * SUPER_ADMIN is deliberately not a valid base role. The platform owner isn't
 * a member of any school, so a school admin must never be able to mint a
 * template pointing at that role — even though a template can only narrow.
 */
export const TEMPLATABLE_ROLES = ["SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"] as const;
export type TemplatableRole = (typeof TEMPLATABLE_ROLES)[number];

export const upsertRoleTemplateSchema = z.object({
  name: z.string().min(1).max(60),
  baseRole: z.enum(TEMPLATABLE_ROLES),
  // Empty is legal and means "nothing beyond the always-allowed set". Useless
  // in practice, but refusing it would be a rule the editor has to explain.
  permissions: z.array(capabilitySchema).max(ALL_CAPABILITIES.length),
});
export type UpsertRoleTemplateInput = z.infer<typeof upsertRoleTemplateSchema>;

export const assignRoleTemplateSchema = z.object({
  /** Null clears the template, returning the user to their unrestricted role. */
  roleTemplateId: z.string().uuid().nullable(),
});
export type AssignRoleTemplateInput = z.infer<typeof assignRoleTemplateSchema>;

/**
 * Ready-made templates for the roles schools actually ask for, offered as a
 * starting point in the editor. Not enforced anywhere — a school is free to
 * build its own, and these exist so the common cases don't start from an empty
 * grid of eighty checkboxes.
 */
export const ROLE_TEMPLATE_PRESETS: {
  name: string;
  baseRole: TemplatableRole;
  description: string;
  permissions: string[];
}[] = [
  {
    name: "Accountant",
    baseRole: "SCHOOL_ADMIN",
    description: "Fees, payments and financial reports. No student or staff records.",
    permissions: [
      "invoices:read",
      "invoices:write",
      "payments:read",
      "payments:write",
      "bank-statement:read",
      "bank-statement:write",
      "reports:read",
      "students:read",
      "classes:read",
    ],
  },
  {
    name: "Exams officer",
    baseRole: "SCHOOL_ADMIN",
    description: "Exams, grades and report cards. Read-only on people, nothing on money.",
    permissions: [
      "exams:read",
      "exams:write",
      "grades:read",
      "grades:write",
      "quizzes:read",
      "quizzes:write",
      "report-cards:read",
      "report-cards:write",
      "students:read",
      "classes:read",
      "timetable:read",
    ],
  },
  {
    name: "Front desk",
    baseRole: "SCHOOL_ADMIN",
    description: "Answers the phone: look things up, post notices, take complaints.",
    permissions: [
      "students:read",
      "teachers:read",
      "classes:read",
      "attendance:read",
      "timetable:read",
      "calendar:read",
      "notices:read",
      "notices:write",
      "complaints:read",
      "complaints:write",
      "messages:read",
      "messages:write",
    ],
  },
  {
    name: "Hostel warden",
    baseRole: "SCHOOL_ADMIN",
    description: "Rooms, beds and residents, plus the student list needed to allocate them.",
    permissions: [
      "hostel:read",
      "hostel:write",
      "students:read",
      "classes:read",
      "inventory:read",
    ],
  },
];

/** Base roles a caller may attach a template to. Used by the editor's UI. */
export function isTemplatableRole(role: RoleType): role is TemplatableRole {
  return (TEMPLATABLE_ROLES as readonly string[]).includes(role);
}
