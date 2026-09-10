import { BadRequestException } from "@nestjs/common";

import { ParseDatePipe } from "./parse-date.pipe";

describe("ParseDatePipe", () => {
  it("parses a valid date string", () => {
    const result = new ParseDatePipe().transform("2026-09-10");
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString().slice(0, 10)).toBe("2026-09-10");
  });

  // These three were 500s: the Invalid Date reached Prisma, which threw.
  it("rejects an unparseable date instead of passing an Invalid Date on", () => {
    expect(() => new ParseDatePipe().transform("garbage")).toThrow(BadRequestException);
  });

  it("rejects a missing required date", () => {
    expect(() => new ParseDatePipe().transform(undefined)).toThrow(BadRequestException);
  });

  it("rejects an empty required date", () => {
    expect(() => new ParseDatePipe().transform("")).toThrow(BadRequestException);
  });

  it("allows a missing date when the parameter is optional", () => {
    expect(new ParseDatePipe({ optional: true }).transform(undefined)).toBeUndefined();
    expect(new ParseDatePipe({ optional: true }).transform("")).toBeUndefined();
  });

  // Optional means "you may omit it", not "you may mistype it" — a filter that
  // silently stops applying is worse than one that says it was wrong.
  it("still rejects an unparseable optional date", () => {
    expect(() => new ParseDatePipe({ optional: true }).transform("not-a-date")).toThrow(
      BadRequestException,
    );
  });
});
