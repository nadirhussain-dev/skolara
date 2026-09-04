import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { InventoryService } from "./inventory.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";
const ITEM = "item-1";
const TEACHER = "teacher-1";
const CLASS = "class-1";
const ASSIGNMENT = "assignment-1";

const duplicate = () =>
  new Prisma.PrismaClientKnownRequestError("unique", {
    code: "P2002",
    clientVersion: "test",
  });

describe("InventoryService", () => {
  let prisma: {
    inventoryItem: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    assetAssignment: {
      create: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      updateMany: jest.Mock;
    };
    user: { findFirst: jest.Mock };
    schoolClass: { findFirst: jest.Mock };
    $executeRaw: jest.Mock;
    $transaction: jest.Mock;
  };
  let service: InventoryService;

  beforeEach(() => {
    prisma = {
      inventoryItem: {
        create: jest.fn().mockResolvedValue({ id: ITEM }),
        findFirst: jest.fn().mockResolvedValue({
          id: ITEM,
          name: "Projector",
          quantity: 3,
          unitsOut: 0,
          condition: "GOOD",
        }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ quantity: 3, unitsOut: 3 }),
        update: jest.fn().mockResolvedValue({ id: ITEM }),
        delete: jest.fn(),
      },
      assetAssignment: {
        create: jest.fn().mockResolvedValue({ id: ASSIGNMENT }),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue({
          id: ASSIGNMENT,
          itemId: ITEM,
          units: 1,
          returnedAt: null,
        }),
        findMany: jest.fn().mockResolvedValue([]),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: ASSIGNMENT }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: { findFirst: jest.fn().mockResolvedValue({ id: TEACHER }) },
      schoolClass: { findFirst: jest.fn().mockResolvedValue({ id: CLASS }) },
      // 1 affected row = the reservation was granted.
      $executeRaw: jest.fn().mockResolvedValue(1),
      $transaction: jest.fn().mockImplementation(async (arg) =>
        typeof arg === "function" ? arg(prisma) : Promise.all(arg),
      ),
    };
    service = new InventoryService(prisma as unknown as PrismaService);
  });

  describe("createItem", () => {
    it("reports a reused asset tag as a conflict", async () => {
      prisma.inventoryItem.create.mockRejectedValue(duplicate());

      await expect(
        service.createItem(SCHOOL, { name: "Projector", category: "AV", quantity: 1 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("updateItem", () => {
    it("refuses a quantity below what is already out", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValue({
        id: ITEM,
        name: "Projector",
        quantity: 5,
        unitsOut: 3,
        condition: "GOOD",
      });

      await expect(
        service.updateItem(SCHOOL, ITEM, { name: "Projector", category: "AV", quantity: 2 }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
    });

    it("allows a quantity exactly equal to what is out", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValue({
        id: ITEM,
        name: "Projector",
        quantity: 5,
        unitsOut: 3,
        condition: "GOOD",
      });

      await service.updateItem(SCHOOL, ITEM, {
        name: "Projector",
        category: "AV",
        quantity: 3,
      });

      expect(prisma.inventoryItem.update).toHaveBeenCalled();
    });
  });

  describe("removeItem", () => {
    it("refuses while any unit is out", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValue({
        id: ITEM,
        name: "Projector",
        quantity: 3,
        unitsOut: 1,
        condition: "GOOD",
      });

      await expect(service.removeItem(SCHOOL, ITEM)).rejects.toThrow(BadRequestException);
      expect(prisma.inventoryItem.delete).not.toHaveBeenCalled();
    });
  });

  describe("listItems", () => {
    it("derives availability and marks damaged stock unissuable", async () => {
      prisma.inventoryItem.findMany.mockResolvedValue([
        { id: ITEM, quantity: 5, unitsOut: 2, condition: "GOOD", purchaseCostPkr: null },
        { id: "item-2", quantity: 1, unitsOut: 0, condition: "DAMAGED", purchaseCostPkr: null },
        { id: "item-3", quantity: 2, unitsOut: 2, condition: "GOOD", purchaseCostPkr: null },
      ]);

      const items = await service.listItems(SCHOOL);

      expect(items[0]).toEqual(expect.objectContaining({ available: 3, issuable: true }));
      // Available but damaged.
      expect(items[1]).toEqual(expect.objectContaining({ available: 1, issuable: false }));
      // Fine, but all out.
      expect(items[2]).toEqual(expect.objectContaining({ available: 0, issuable: false }));
    });

    it("can list only what can actually be issued", async () => {
      prisma.inventoryItem.findMany.mockResolvedValue([
        { id: ITEM, quantity: 5, unitsOut: 2, condition: "GOOD", purchaseCostPkr: null },
        { id: "item-2", quantity: 1, unitsOut: 0, condition: "WRITTEN_OFF", purchaseCostPkr: null },
      ]);

      const items = await service.listItems(SCHOOL, { onlyAvailable: true });

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(ITEM);
    });
  });

  describe("issue", () => {
    it("reserves stock in the same statement that checks it", async () => {
      await service.issue(SCHOOL, ITEM, { assignedToUserId: TEACHER, units: 2 });

      // The guard is in the SQL, not in a prior read — that is what makes two
      // concurrent issues safe at READ COMMITTED.
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(prisma.assetAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ units: 2, assignedToUserId: TEACHER, classId: null }),
        }),
      );
    });

    it("defaults to one unit", async () => {
      await service.issue(SCHOOL, ITEM, { classId: CLASS, units: 1 });

      expect(prisma.assetAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ units: 1, classId: CLASS, assignedToUserId: null }),
        }),
      );
    });

    it("refuses when the conditional update reserves nothing", async () => {
      prisma.$executeRaw.mockResolvedValue(0);
      prisma.inventoryItem.findUnique.mockResolvedValue({ quantity: 3, unitsOut: 3 });

      await expect(
        service.issue(SCHOOL, ITEM, { assignedToUserId: TEACHER, units: 1 }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.assetAssignment.create).not.toHaveBeenCalled();
    });

    it("says how many are left when the ask was too large", async () => {
      prisma.$executeRaw.mockResolvedValue(0);
      prisma.inventoryItem.findUnique.mockResolvedValue({ quantity: 5, unitsOut: 3 });

      await expect(
        service.issue(SCHOOL, ITEM, { assignedToUserId: TEACHER, units: 4 }),
      ).rejects.toThrow(/Only 2 available/);
    });

    it("refuses to issue damaged stock", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValue({
        id: ITEM,
        name: "Projector",
        quantity: 1,
        unitsOut: 0,
        condition: "DAMAGED",
      });

      await expect(
        service.issue(SCHOOL, ITEM, { assignedToUserId: TEACHER, units: 1 }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it("refuses a holder from another school", async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.issue(SCHOOL, ITEM, { assignedToUserId: TEACHER, units: 1 }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it("refuses a class from another school", async () => {
      prisma.schoolClass.findFirst.mockResolvedValue(null);

      await expect(service.issue(SCHOOL, ITEM, { classId: CLASS, units: 1 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("returnAsset", () => {
    it("claims the return conditionally so a double tap can't decrement twice", async () => {
      await service.returnAsset(SCHOOL, ASSIGNMENT, { returnedCondition: "GOOD" });

      expect(prisma.assetAssignment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ASSIGNMENT, schoolId: SCHOOL, returnedAt: null },
        }),
      );
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("refuses an already-returned assignment", async () => {
      prisma.assetAssignment.findFirst.mockResolvedValue({
        id: ASSIGNMENT,
        itemId: ITEM,
        units: 1,
        returnedAt: new Date(),
      });

      await expect(
        service.returnAsset(SCHOOL, ASSIGNMENT, { returnedCondition: "GOOD" }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it("carries damage found on return up onto the item", async () => {
      await service.returnAsset(SCHOOL, ASSIGNMENT, { returnedCondition: "DAMAGED" });

      expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ITEM },
          data: { condition: "DAMAGED" },
        }),
      );
    });

    it("leaves the item's condition alone when it comes back fine", async () => {
      await service.returnAsset(SCHOOL, ASSIGNMENT, { returnedCondition: "FAIR" });

      expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
    });

    it("refuses an assignment in another school", async () => {
      prisma.assetAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.returnAsset(SCHOOL, ASSIGNMENT, { returnedCondition: "GOOD" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("summary", () => {
    it("aggregates units, value and attention per category", async () => {
      prisma.inventoryItem.findMany.mockResolvedValue([
        { category: "AV", quantity: 3, unitsOut: 1, condition: "GOOD", purchaseCostPkr: 1000 },
        { category: "AV", quantity: 1, unitsOut: 0, condition: "DAMAGED", purchaseCostPkr: 500 },
        { category: "Lab", quantity: 10, unitsOut: 4, condition: "GOOD", purchaseCostPkr: null },
      ]);
      prisma.assetAssignment.count.mockResolvedValue(2);

      const summary = await service.summary(SCHOOL);

      expect(summary).toEqual(
        expect.objectContaining({
          items: 3,
          units: 14,
          unitsOut: 5,
          needsAttention: 1,
          overdue: 2,
          // Cost is per unit: 3 × 1000 + 1 × 500, and the Lab items have no cost.
          totalValuePkr: 3500,
        }),
      );
      expect(summary.byCategory).toEqual([
        { category: "AV", items: 2, units: 4, unitsOut: 1 },
        { category: "Lab", items: 1, units: 10, unitsOut: 4 },
      ]);
    });

    it("counts only overdue assignments still out", async () => {
      await service.summary(SCHOOL);

      expect(prisma.assetAssignment.count).toHaveBeenCalledWith({
        where: { schoolId: SCHOOL, returnedAt: null, dueBackOn: { lt: expect.any(Date) } },
      });
    });
  });
});
