import type { MessageKey } from "@skolara/i18n";
import type { RoleType } from "@skolara/types";

export interface NavItem {
  href: string;
  /** Message key rather than a literal — the sidebar renders in the user's language. */
  labelKey: MessageKey;
  roles: RoleType[];
  groupKey: MessageKey;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/super-admin/schools",
    labelKey: "nav.schools",
    roles: ["SUPER_ADMIN"],
    groupKey: "nav.platform",
  },
  {
    href: "/super-admin/school-groups",
    labelKey: "nav.schoolGroups",
    roles: ["SUPER_ADMIN"],
    groupKey: "nav.platform",
  },
  {
    href: "/super-admin/analytics",
    labelKey: "nav.analytics",
    roles: ["SUPER_ADMIN"],
    groupKey: "nav.platform",
  },

  {
    href: "/school/analytics",
    labelKey: "nav.overview",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.overview",
  },

  {
    href: "/school/students",
    labelKey: "nav.students",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.people",
  },
  {
    href: "/school/teachers",
    labelKey: "nav.teachers",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.people",
  },
  {
    href: "/school/classes",
    labelKey: "nav.classes",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.people",
  },
  {
    href: "/school/users",
    labelKey: "nav.accounts",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.people",
  },

  {
    href: "/school/attendance",
    labelKey: "nav.attendance",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.academics",
  },
  {
    href: "/teacher/timetable",
    labelKey: "nav.timetable",
    roles: ["TEACHER"],
    groupKey: "nav.academics",
  },
  {
    href: "/teacher/meetings",
    labelKey: "nav.meetings",
    roles: ["TEACHER"],
    groupKey: "nav.communication",
  },
  {
    href: "/teacher/gradebook",
    labelKey: "nav.gradebook",
    roles: ["TEACHER"],
    groupKey: "nav.academics",
  },
  {
    href: "/school/exams",
    labelKey: "nav.exams",
    roles: ["SCHOOL_ADMIN", "TEACHER"],
    groupKey: "nav.academics",
  },
  {
    href: "/school/timetable",
    labelKey: "nav.timetable",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.academics",
  },
  {
    href: "/school/calendar",
    labelKey: "nav.calendar",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.academics",
  },
  {
    href: "/school/report-cards",
    labelKey: "nav.reportCards",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.academics",
  },
  {
    href: "/school/assignments",
    labelKey: "nav.assignments",
    roles: ["SCHOOL_ADMIN", "TEACHER"],
    groupKey: "nav.academics",
  },

  {
    href: "/school/invoices",
    labelKey: "nav.invoices",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.finance",
  },
  {
    href: "/school/payments",
    labelKey: "nav.paymentQueue",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.finance",
  },
  {
    href: "/school/bank-statement",
    labelKey: "nav.bankStatement",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.finance",
  },

  {
    href: "/school/notices",
    labelKey: "nav.notices",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.communication",
  },
  {
    href: "/school/complaints",
    labelKey: "nav.complaints",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.communication",
  },

  {
    href: "/school/leave",
    labelKey: "nav.leave",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.people",
  },

  {
    href: "/school/library",
    labelKey: "nav.library",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.operations",
  },
  {
    href: "/school/transport",
    labelKey: "nav.transport",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.operations",
  },
  {
    href: "/school/payroll",
    labelKey: "nav.payroll",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.operations",
  },

  {
    href: "/support",
    labelKey: "nav.support",
    roles: ["SCHOOL_ADMIN", "SUPER_ADMIN"],
    groupKey: "nav.settings",
  },

  {
    href: "/school/branding",
    labelKey: "nav.branding",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.settings",
  },
  {
    href: "/school/api-keys",
    labelKey: "nav.apiKeys",
    roles: ["SCHOOL_ADMIN"],
    groupKey: "nav.settings",
  },
  {
    href: "/school/audit-logs",
    labelKey: "nav.auditLog",
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    groupKey: "nav.settings",
  },
];
