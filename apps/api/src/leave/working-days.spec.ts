import { workingDaysBetween } from "./working-days";

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("workingDaysBetween", () => {
  it("counts a single weekday as one day", () => {
    // 2026-09-07 is a Monday.
    expect(workingDaysBetween(utc("2026-09-07"), utc("2026-09-07"))).toBe(1);
  });

  it("counts the range inclusively", () => {
    // Monday to Wednesday is three days, not two.
    expect(workingDaysBetween(utc("2026-09-07"), utc("2026-09-09"))).toBe(3);
  });

  it("counts Saturday — the school week runs Monday to Saturday", () => {
    expect(workingDaysBetween(utc("2026-09-12"), utc("2026-09-12"))).toBe(1);
  });

  it("excludes Sunday", () => {
    expect(workingDaysBetween(utc("2026-09-13"), utc("2026-09-13"))).toBe(0);
  });

  it("skips the Sunday inside a full week", () => {
    // Mon 7th to Sun 13th: six working days.
    expect(workingDaysBetween(utc("2026-09-07"), utc("2026-09-13"))).toBe(6);
  });

  it("skips every Sunday across a longer range", () => {
    // Mon 7th to Sat 19th: 13 calendar days, one Sunday (the 13th), 12 working.
    expect(workingDaysBetween(utc("2026-09-07"), utc("2026-09-19"))).toBe(12);
  });

  it("skips both Sundays across a full fortnight", () => {
    // Mon 7th to Sun 20th: two Sundays (13th, 20th), 12 working.
    expect(workingDaysBetween(utc("2026-09-07"), utc("2026-09-20"))).toBe(12);
  });

  it("returns zero when the range is inverted", () => {
    expect(workingDaysBetween(utc("2026-09-09"), utc("2026-09-07"))).toBe(0);
  });

  it("counts across a month boundary", () => {
    // Mon 28 Sep to Fri 2 Oct.
    expect(workingDaysBetween(utc("2026-09-28"), utc("2026-10-02"))).toBe(5);
  });

  it("ignores the time component, so an afternoon request is still a full day", () => {
    const afternoon = new Date("2026-09-07T15:30:00.000Z");
    const morning = new Date("2026-09-07T08:00:00.000Z");
    expect(workingDaysBetween(afternoon, morning)).toBe(1);
  });
});
