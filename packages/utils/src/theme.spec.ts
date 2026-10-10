import {
  BRAND_STEPS,
  DEFAULT_BRAND_COLOR,
  brandCssVariables,
  brandScale,
  contrastRatio,
  hexToRgb,
  isReadableUnderWhiteText,
  rgbToHex,
  safeBrandColor,
} from "./theme";

describe("safeBrandColor", () => {
  it("keeps a colour that already carries white text", () => {
    expect(safeBrandColor("#0F766E")).toBe("#0F766E");
    expect(safeBrandColor(DEFAULT_BRAND_COLOR)).toBe(DEFAULT_BRAND_COLOR);
  });

  it("darkens a colour that is too light until white text is readable on it", () => {
    const safe = safeBrandColor("#FACC15");
    expect(safe).not.toBe("#FACC15");
    expect(isReadableUnderWhiteText(safe)).toBe(true);
  });

  it("keeps the hue when darkening, rather than drifting to grey or another colour", () => {
    const [r, g, b] = hexToRgb(safeBrandColor("#FACC15"));
    // Yellow stays yellow: red and green well above blue.
    expect(r).toBeGreaterThan(b * 3);
    expect(g).toBeGreaterThan(b * 3);
  });

  it("falls back to the default for anything that is not a hex colour", () => {
    for (const bad of [null, undefined, "", "teal", "#12", "#GGGGGG", "3730A3"]) {
      expect(safeBrandColor(bad)).toBe(DEFAULT_BRAND_COLOR);
    }
  });

  it("can make even white usable", () => {
    expect(isReadableUnderWhiteText(safeBrandColor("#FFFFFF"))).toBe(true);
  });
});

describe("brandScale", () => {
  it("puts the school's colour at 700", () => {
    expect(rgbToHex(brandScale("#0F766E")[700])).toBe("#0F766E");
  });

  it("gets steadily darker from 50 to 900", () => {
    const scale = brandScale("#9F1239");
    const white = [255, 255, 255] as const;
    const contrasts = BRAND_STEPS.map((step) => contrastRatio(scale[step], white));
    for (let i = 1; i < contrasts.length; i++) {
      expect(contrasts[i]).toBeGreaterThan(contrasts[i - 1] as number);
    }
  });

  it("keeps the tints light enough to sit behind dark text", () => {
    const scale = brandScale("#1F2937");
    expect(contrastRatio(scale[50], hexToRgb("#0F172A"))).toBeGreaterThan(12);
  });

  it("uses the default scale when the school has set nothing", () => {
    expect(brandScale(null)).toEqual(brandScale(DEFAULT_BRAND_COLOR));
  });
});

describe("brandCssVariables", () => {
  it("emits one channel triplet per step", () => {
    const variables = brandCssVariables("#0F766E");
    expect(Object.keys(variables)).toHaveLength(BRAND_STEPS.length);
    expect(variables["--brand-700"]).toBe("15 118 110");
  });
});

describe("hex conversion", () => {
  it("round-trips", () => {
    expect(rgbToHex(hexToRgb("#3730a3"))).toBe("#3730A3");
  });

  it("rejects malformed input", () => {
    expect(() => hexToRgb("#fff")).toThrow();
  });
});
