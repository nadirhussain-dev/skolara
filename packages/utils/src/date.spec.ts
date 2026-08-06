import { isSameDay, startOfDay } from "./date";

describe("isSameDay", () => {
  it("is true for the same calendar day at different times", () => {
    expect(isSameDay(new Date("2026-08-06T08:00:00"), new Date("2026-08-06T23:00:00"))).toBe(
      true,
    );
  });

  it("is false across a day boundary", () => {
    expect(isSameDay(new Date("2026-08-06T23:59:00"), new Date("2026-08-07T00:01:00"))).toBe(
      false,
    );
  });
});

describe("startOfDay", () => {
  it("zeroes out the time components without mutating the input", () => {
    const input = new Date("2026-08-06T15:30:45");
    const result = startOfDay(input);

    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(input.getHours()).toBe(15); // original untouched
  });
});
