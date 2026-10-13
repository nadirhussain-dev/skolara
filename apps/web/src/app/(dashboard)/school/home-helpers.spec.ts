import { calendarDaysBetween, classLabel, dayPart, localDateKey } from "./home-helpers";

describe("localDateKey", () => {
  it("pads month and day", () => {
    expect(localDateKey(new Date(2026, 0, 5, 9))).toBe("2026-01-05");
  });

  it("uses the local date, not the UTC one", () => {
    // 00:30 local on the 12th is still the 12th wherever the viewer is.
    expect(localDateKey(new Date(2026, 9, 12, 0, 30))).toBe("2026-10-12");
  });
});

describe("dayPart", () => {
  it("splits the day at noon and 5pm", () => {
    expect(dayPart(new Date(2026, 9, 12, 8))).toBe("morning");
    expect(dayPart(new Date(2026, 9, 12, 12))).toBe("afternoon");
    expect(dayPart(new Date(2026, 9, 12, 17))).toBe("evening");
  });
});

describe("calendarDaysBetween", () => {
  const morning = new Date(2026, 9, 12, 8);

  it("is 0 for earlier the same day", () => {
    expect(calendarDaysBetween(new Date(2026, 9, 12, 0, 5), morning)).toBe(0);
  });

  it("calls late last night yesterday, though it is under 24 hours ago", () => {
    expect(calendarDaysBetween(new Date(2026, 9, 11, 23), morning)).toBe(1);
  });

  it("counts across a month boundary", () => {
    expect(calendarDaysBetween(new Date(2026, 8, 30, 15), morning)).toBe(12);
  });

  it("never goes negative for a timestamp slightly in the future", () => {
    expect(calendarDaysBetween(new Date(2026, 9, 13, 1), morning)).toBe(0);
  });
});

describe("classLabel", () => {
  it("keeps name and section in order inside left-to-right isolates", () => {
    expect(classLabel("5", "B")).toBe("\u20665-B\u2069");
  });

  it("shows only the name for a class with no section", () => {
    expect(classLabel("Nursery", null)).toBe("\u2066Nursery\u2069");
  });
});
