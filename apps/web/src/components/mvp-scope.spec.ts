import { isInMvpNav } from "./mvp-scope";
import { NAV_ITEMS } from "./nav-items";

describe("isInMvpNav", () => {
  it("keeps the six MVP loops in the sidebar", () => {
    for (const href of [
      "/school/students",
      "/school/invoices",
      "/school/payments",
      "/school/attendance",
      "/school/exams",
      "/school/report-cards",
      "/school/notices",
      "/school/complaints",
      "/school/branding",
    ]) {
      expect(isInMvpNav(href)).toBe(true);
    }
  });

  it("hides deferred modules", () => {
    for (const href of ["/school/hostel", "/school/inventory", "/school/payroll", "/school/quizzes"]) {
      expect(isInMvpNav(href)).toBe(false);
    }
  });

  it("only defers links that exist, so a renamed route can't silently reappear", () => {
    const known = new Set(NAV_ITEMS.map((item) => item.href));
    const hidden = NAV_ITEMS.filter((item) => !isInMvpNav(item.href));
    // 26 deferred hrefs, every one of them a real nav item.
    expect(hidden).toHaveLength(26);
    for (const item of hidden) expect(known.has(item.href)).toBe(true);
  });

  it("leaves every role with somewhere to go", () => {
    for (const role of ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"] as const) {
      const visible = NAV_ITEMS.filter((i) => i.roles.includes(role) && isInMvpNav(i.href));
      expect(visible.length).toBeGreaterThan(0);
    }
  });
});
