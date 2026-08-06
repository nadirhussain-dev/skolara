import type { RoleType } from "@skolara/types";

export interface NavItem {
  href: string;
  label: string;
  roles: RoleType[];
  group: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/super-admin/schools", label: "Schools", roles: ["SUPER_ADMIN"], group: "Platform" },
  {
    href: "/super-admin/school-groups",
    label: "School Groups",
    roles: ["SUPER_ADMIN"],
    group: "Platform",
  },
  {
    href: "/super-admin/analytics",
    label: "Analytics",
    roles: ["SUPER_ADMIN"],
    group: "Platform",
  },

  { href: "/school/analytics", label: "Overview", roles: ["SCHOOL_ADMIN"], group: "Overview" },

  { href: "/school/students", label: "Students", roles: ["SCHOOL_ADMIN"], group: "People" },
  { href: "/school/teachers", label: "Teachers", roles: ["SCHOOL_ADMIN"], group: "People" },
  { href: "/school/classes", label: "Classes", roles: ["SCHOOL_ADMIN"], group: "People" },

  {
    href: "/teacher/gradebook",
    label: "Gradebook",
    roles: ["TEACHER"],
    group: "Academics",
  },
  {
    href: "/school/exams",
    label: "Exams",
    roles: ["SCHOOL_ADMIN", "TEACHER"],
    group: "Academics",
  },
  {
    href: "/school/assignments",
    label: "Assignments",
    roles: ["SCHOOL_ADMIN", "TEACHER"],
    group: "Academics",
  },

  { href: "/school/invoices", label: "Invoices", roles: ["SCHOOL_ADMIN"], group: "Finance" },
  { href: "/school/payments", label: "Payment queue", roles: ["SCHOOL_ADMIN"], group: "Finance" },
  {
    href: "/school/bank-statement",
    label: "Bank statement",
    roles: ["SCHOOL_ADMIN"],
    group: "Finance",
  },

  { href: "/school/notices", label: "Notices", roles: ["SCHOOL_ADMIN"], group: "Communication" },
  {
    href: "/school/complaints",
    label: "Complaints",
    roles: ["SCHOOL_ADMIN"],
    group: "Communication",
  },

  { href: "/school/library", label: "Library", roles: ["SCHOOL_ADMIN"], group: "Operations" },
  { href: "/school/transport", label: "Transport", roles: ["SCHOOL_ADMIN"], group: "Operations" },
  { href: "/school/payroll", label: "Payroll", roles: ["SCHOOL_ADMIN"], group: "Operations" },

  { href: "/school/branding", label: "Branding", roles: ["SCHOOL_ADMIN"], group: "Settings" },
  { href: "/school/api-keys", label: "API keys", roles: ["SCHOOL_ADMIN"], group: "Settings" },
];
