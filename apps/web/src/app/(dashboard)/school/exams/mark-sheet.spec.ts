import { parseMark } from "./mark-sheet";

describe("parseMark", () => {
  it("accepts whole and decimal marks up to the maximum", () => {
    expect(parseMark("41", 50)).toBe(41);
    expect(parseMark(" 49.5 ", 50)).toBe(49.5);
    expect(parseMark("0", 50)).toBe(0);
    expect(parseMark("50", 50)).toBe(50);
  });
  it("refuses anything over the maximum or not a plain number", () => {
    for (const bad of ["51", "-1", "4e1", "abc", "", "1.234", "12.", "+5"]) expect(parseMark(bad, 50)).toBeNull();
  });
});
