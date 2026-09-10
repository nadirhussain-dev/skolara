import { BadRequestException, PipeTransform } from "@nestjs/common";

/**
 * Turns a `?date=` query string into a Date, rejecting anything unparseable.
 *
 * Without this, `new Date(someQueryParam)` hands an Invalid Date straight to
 * Prisma, which throws — so a client typo surfaced as a 500 rather than the
 * 400 it is. Missing is allowed only when the parameter is genuinely optional.
 */
export class ParseDatePipe implements PipeTransform<string | undefined, Date | undefined> {
  constructor(private readonly options: { optional?: boolean } = {}) {}

  transform(value: string | undefined): Date | undefined {
    if (value === undefined || value === "") {
      if (this.options.optional) return undefined;
      throw new BadRequestException("A date is required (expected YYYY-MM-DD)");
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid date: ${value} (expected YYYY-MM-DD)`);
    }
    return parsed;
  }
}
