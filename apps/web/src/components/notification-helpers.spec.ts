import { notificationHref, relativeTime } from "./notification-helpers";

describe("notificationHref", () => {
  it("routes an admin to the screen that deals with it", () => {
    expect(notificationHref({ type: "PAYMENT", submissionId: "x" }, "SCHOOL_ADMIN")).toBe("/school/payments");
    expect(notificationHref({ type: "LEAVE_REQUEST" }, "SCHOOL_ADMIN")).toBe("/school/leave");
  });

  it("returns null when there is no screen, no type or no data", () => {
    expect(notificationHref({ type: "ATTENDANCE" }, "SCHOOL_ADMIN")).toBeNull();
    expect(notificationHref({}, "SCHOOL_ADMIN")).toBeNull();
    expect(notificationHref(null, "TEACHER")).toBeNull();
    expect(notificationHref({ type: "PAYMENT" }, "TEACHER")).toBeNull();
  });

  it("never turns payload text into a URL", () => {
    expect(notificationHref({ type: "https://evil.example", url: "javascript:alert(1)" }, "SCHOOL_ADMIN")).toBeNull();
    expect(notificationHref({ type: "constructor" }, "SCHOOL_ADMIN")).toBeNull();
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-10-11T12:00:00Z");
  it("picks a sensible unit", () => {
    expect(relativeTime(new Date("2026-10-11T11:55:00Z"), now, "en-GB")).toBe("5 minutes ago");
    expect(relativeTime(new Date("2026-10-11T09:00:00Z"), now, "en-GB")).toBe("3 hours ago");
    expect(relativeTime(new Date("2026-10-10T12:00:00Z"), now, "en-GB")).toBe("yesterday");
    expect(relativeTime(new Date("2026-10-11T11:59:50Z"), now, "en-GB")).toBe("now");
  });
});
