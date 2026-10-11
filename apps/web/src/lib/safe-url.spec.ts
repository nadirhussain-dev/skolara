import { safeHttpUrl } from "./safe-url";

describe("safeHttpUrl", () => {
  it("passes http and https addresses", () => {
    expect(safeHttpUrl("https://files.example.com/a.png")).toBe("https://files.example.com/a.png");
    expect(safeHttpUrl("http://localhost:4000/x")).toBe("http://localhost:4000/x");
  });

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    " javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "//evil.example/x",
    "/relative/path",
    "not a url",
    "",
  ])("refuses %p", (value) => {
    expect(safeHttpUrl(value)).toBeNull();
  });

  it("refuses null and undefined", () => {
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
  });
});
