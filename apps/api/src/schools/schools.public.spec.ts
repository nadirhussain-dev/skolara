import { NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";
import { SchoolsService } from "./schools.service";

describe("SchoolsService.findPublicByCode", () => {
  let prisma: { school: { findUnique: jest.Mock } };
  let service: SchoolsService;
  const school = {
    name: "Green Valley School",
    subdomain: "greenvalley",
    logoUrl: null,
    primaryColor: "#0F766E",
    subscriptionStatus: "ACTIVE",
  };

  beforeEach(() => {
    prisma = { school: { findUnique: jest.fn().mockResolvedValue(school) } };
    service = new (SchoolsService as unknown as new (p: PrismaService) => SchoolsService)(
      prisma as unknown as PrismaService,
    );
  });

  it("returns only name, code, logo and colour", async () => {
    expect(await service.findPublicByCode("greenvalley")).toEqual({
      name: "Green Valley School",
      subdomain: "greenvalley",
      logoUrl: null,
      primaryColor: "#0F766E",
    });
  });

  it.each(["PENDING", "SUSPENDED", "REJECTED", "EXPIRED"])(
    "answers a %s school like one that does not exist",
    async (subscriptionStatus) => {
      prisma.school.findUnique.mockResolvedValue({ ...school, subscriptionStatus });
      await expect(service.findPublicByCode("greenvalley")).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it.each(["", "a b", "../etc", "x'--", "www", "-bad", "a".repeat(64)])(
    "refuses the malformed or reserved code %p without touching the database",
    async (code) => {
      await expect(service.findPublicByCode(code)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.school.findUnique).not.toHaveBeenCalled();
    },
  );
});
