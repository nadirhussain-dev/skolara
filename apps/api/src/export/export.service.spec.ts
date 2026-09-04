import { NotFoundException } from "@nestjs/common";
import { ExportService } from "./export.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";

/**
 * Every delegate the service touches, each recording the args it was called
 * with. A Proxy rather than a hand-written mock: the point of most of these
 * tests is *what the queries ask for*, and enumerating forty delegates by hand
 * would go stale the first time a table is added.
 */
function prismaSpy() {
  const calls: Record<string, { where?: unknown; select?: unknown; orderBy?: unknown }[]> = {};

  const delegate = (name: string) => ({
    findMany: jest.fn((args = {}) => {
      calls[name] = [...(calls[name] ?? []), args];
      return Promise.resolve([]);
    }),
  });

  const store: Record<string, unknown> = {
    school: {
      findUnique: jest.fn(() =>
        Promise.resolve({ id: SCHOOL, name: "Acme", subdomain: "acme" }),
      ),
    },
  };

  const prisma = new Proxy(store, {
    get(target, key: string) {
      if (key in target) return target[key];
      target[key] = delegate(key);
      return target[key];
    },
  });

  return { prisma: prisma as unknown as PrismaService, calls, store };
}

describe("ExportService", () => {
  it("scopes every table to the requested school", async () => {
    const { prisma, calls } = prismaSpy();
    const service = new ExportService(prisma);

    await service.bundle(SCHOOL);

    const everyCall = Object.values(calls).flat();
    expect(everyCall.length).toBeGreaterThan(30);
    for (const call of everyCall) {
      // Either directly scoped, or scoped through a parent that is.
      expect(JSON.stringify(call.where)).toContain(SCHOOL);
    }
  });

  describe("credential exclusions", () => {
    it("never selects a user's password hash", async () => {
      const { prisma, calls } = prismaSpy();
      const service = new ExportService(prisma);

      await service.bundle(SCHOOL);

      const userSelect = calls.user?.[0]?.select as Record<string, boolean>;
      expect(userSelect).toBeDefined();
      // An allowlist, so absence is the assertion — and the fields that must
      // be there are asserted too, so a future "select everything" rewrite
      // fails this test rather than passing it.
      expect(userSelect.passwordHash).toBeUndefined();
      expect(userSelect.email).toBe(true);
      expect(userSelect.role).toBe(true);
    });

    it("never selects an API key's hash", async () => {
      const { prisma, calls } = prismaSpy();
      const service = new ExportService(prisma);

      await service.bundle(SCHOOL);

      const keySelect = calls.apiKey?.[0]?.select as Record<string, boolean>;
      expect(keySelect).toBeDefined();
      expect(keySelect.hashedKey).toBeUndefined();
      expect(keySelect.keyPrefix).toBe(true);
    });

    it("does not touch the credential tables at all", async () => {
      const { prisma, calls } = prismaSpy();
      const service = new ExportService(prisma);

      await service.bundle(SCHOOL);

      expect(calls.refreshToken).toBeUndefined();
      expect(calls.passwordResetToken).toBeUndefined();
      expect(calls.deviceToken).toBeUndefined();
    });

    it("does not export the audit trail or bus pings", async () => {
      const { prisma, calls } = prismaSpy();
      const service = new ExportService(prisma);

      await service.bundle(SCHOOL);

      expect(calls.auditLog).toBeUndefined();
      expect(calls.busLocationPing).toBeUndefined();
    });

    it("filters platform-internal support notes out of the export", async () => {
      const { prisma, calls } = prismaSpy();
      const service = new ExportService(prisma);

      await service.bundle(SCHOOL);

      // The same filter the support service applies — an export must not be a
      // way round it.
      expect(calls.supportTicketComment?.[0]?.where).toEqual(
        expect.objectContaining({ internal: false }),
      );
    });
  });

  describe("bundle", () => {
    it("reports a row count per table and a total", async () => {
      const { prisma, store } = prismaSpy();
      (store.studentProfile as { findMany: jest.Mock }) = {
        findMany: jest.fn(() => Promise.resolve([{ id: "s1" }, { id: "s2" }])),
      };
      const service = new ExportService(prisma);

      const bundle = await service.bundle(SCHOOL);

      expect(bundle.manifest.rowCounts.students).toBe(2);
      expect(bundle.manifest.totalRows).toBe(2);
      expect(bundle.data.students).toHaveLength(2);
    });

    it("stamps a format version, so a future shape change is detectable", async () => {
      const { prisma } = prismaSpy();
      const service = new ExportService(prisma);

      const bundle = await service.bundle(SCHOOL);

      expect(bundle.manifest.formatVersion).toBe(1);
      expect(bundle.manifest.exportedAt).toEqual(expect.any(String));
    });

    it("says in the manifest that uploaded files are links, not bytes", async () => {
      const { prisma } = prismaSpy();
      const service = new ExportService(prisma);

      const bundle = await service.bundle(SCHOOL);

      expect(bundle.manifest.notes.join(" ")).toMatch(/referenced by URL/i);
    });

    it("refuses a school that doesn't exist", async () => {
      const { prisma, store } = prismaSpy();
      (store.school as { findUnique: jest.Mock }).findUnique.mockResolvedValue(null);
      const service = new ExportService(prisma);

      await expect(service.bundle(SCHOOL)).rejects.toThrow(NotFoundException);
    });
  });

  describe("tableCsv", () => {
    it("refuses a table that isn't on the exportable list", async () => {
      const { prisma } = prismaSpy();
      const service = new ExportService(prisma);

      // Notably including tables that exist but are deliberately excluded.
      await expect(service.tableCsv(SCHOOL, "refreshToken")).rejects.toThrow(NotFoundException);
      await expect(service.tableCsv(SCHOOL, "auditLog")).rejects.toThrow(NotFoundException);
    });

    it("returns a header-only file for an empty table rather than nothing", async () => {
      const { prisma } = prismaSpy();
      const service = new ExportService(prisma);

      const csv = await service.tableCsv(SCHOOL, "students");

      expect(csv).toBe("students\r\n");
    });

    it("flattens dates, booleans and structures into scalar cells", async () => {
      const { prisma, store } = prismaSpy();
      (store.teacherProfile as { findMany: jest.Mock }) = {
        findMany: jest.fn(() =>
          Promise.resolve([
            {
              id: "t1",
              employeeNumber: "E1",
              subjects: ["Maths", "Physics"],
              joinedOn: new Date("2026-01-02T03:04:05.000Z"),
              active: true,
              note: null,
            },
          ]),
        ),
      };
      const service = new ExportService(prisma);

      const csv = await service.tableCsv(SCHOOL, "teachers");

      const [header, row] = csv.trim().split("\r\n");
      expect(header).toBe("id,employeeNumber,subjects,joinedOn,active,note");
      expect(row).toBe('t1,E1,"[""Maths"",""Physics""]",2026-01-02T03:04:05.000Z,true,');
    });

    it("lists the exportable tables without hitting the database", () => {
      const { prisma, calls } = prismaSpy();
      const service = new ExportService(prisma);

      const names = service.tableNames();

      expect(names).toContain("students");
      expect(names).toContain("invoices");
      expect(names).not.toContain("auditLog");
      expect(Object.keys(calls)).toHaveLength(0);
    });
  });
});
