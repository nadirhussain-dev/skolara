import type { RoleType } from "@skolara/types";

// Maps, not plain objects: a payload type of "constructor" must find nothing.
const ADMIN_ROUTES = new Map(Object.entries({
  PAYMENT: "/school/payments",
  COMPLAINT: "/school/complaints",
  LEAVE_REQUEST: "/school/leave",
  ABSENCE_REQUEST: "/school/absences",
  NOTICE: "/school/notices",
  EXPENSE: "/school/finance",
  SUPPORT_TICKET: "/support",
}));

const TEACHER_ROUTES = new Map(Object.entries({
  MEETING: "/teacher/meetings",
  MESSAGE: "/teacher/messages",
  LEAVE: "/teacher/leave",
  HOMEWORK: "/school/assignments",
}));

/**
 * Where a notification should take this user in the web app, or null when
 * the web app has no screen for it. Only fixed, in-app paths are ever
 * returned: nothing from the notification's payload is used as a URL.
 */
export function notificationHref(
  data: Record<string, string> | null,
  role: RoleType,
): string | null {
  const type = data?.type;
  if (!type) return null;
  if (role === "SCHOOL_ADMIN") return ADMIN_ROUTES.get(type) ?? null;
  if (role === "TEACHER") return TEACHER_ROUTES.get(type) ?? null;
  if (role === "SUPER_ADMIN") return type === "SUPPORT_TICKET" ? "/support" : null;
  return null;
}

const STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "5 minutes ago", "yesterday", in the given Intl locale. */
export function relativeTime(then: Date, now: Date, locale: string): string {
  const seconds = Math.round((then.getTime() - now.getTime()) / 1000);
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return format.format(0, "second");
}
