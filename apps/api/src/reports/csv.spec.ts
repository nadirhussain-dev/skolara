import { toCsv } from "./csv";

describe("toCsv", () => {
  it("writes a header row and CRLF line endings", () => {
    expect(toCsv(["A", "B"], [["1", "2"]])).toBe("A,B\r\n1,2\r\n");
  });

  it("quotes cells containing a comma", () => {
    expect(toCsv(["Name"], [["Khan, Ayesha"]])).toContain('"Khan, Ayesha"');
  });

  it("doubles embedded quotes rather than breaking the row", () => {
    expect(toCsv(["Note"], [['He said "yes"']])).toContain('"He said ""yes"""');
  });

  it("quotes cells containing newlines so the row stays one row", () => {
    const csv = toCsv(["Note"], [["line one\nline two"]]);
    expect(csv).toContain('"line one\nline two"');
    // Header, the quoted cell, and the trailing terminator.
    expect(csv.split("\r\n")).toHaveLength(3);
  });

  it("renders null and undefined as empty rather than the words", () => {
    expect(toCsv(["A", "B"], [[null, undefined as unknown as null]])).toBe("A,B\r\n,\r\n");
  });

  it.each(["=SUM(A1:A9)", "+1", "-1+1", "@import"])(
    "neutralises %s so a spreadsheet doesn't execute it as a formula",
    (payload) => {
      expect(toCsv(["X"], [[payload]])).toContain(`'${payload}`);
    },
  );

  it("leaves an ordinary negative number readable after neutralising", () => {
    // Still prefixed — correctness of the guard beats prettiness here, and
    // fee columns are written as positive strings anyway.
    expect(toCsv(["X"], [["-500"]])).toContain("'-500");
  });

  it("passes numbers through unquoted", () => {
    expect(toCsv(["N"], [[1234]])).toBe("N\r\n1234\r\n");
  });
});
