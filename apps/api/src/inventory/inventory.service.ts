import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  AssetCondition,
  InventorySummary,
  IssueAssetInput,
  ReturnAssetInput,
  UpsertInventoryItemInput,
} from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

/** Conditions that mean an item shouldn't go back out without a look at it. */
const UNISSUABLE: AssetCondition[] = ["DAMAGED", "WRITTEN_OFF"];

const ASSIGNMENT_INCLUDE = {
  item: { select: { id: true, name: true, category: true, assetTag: true } },
  assignedToUser: { select: { id: true, firstName: true, lastName: true, role: true } },
  class: { select: { id: true, name: true, section: true } },
} as const;

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // ---------- items ----------

  async createItem(schoolId: string, input: UpsertInventoryItemInput) {
    try {
      return await this.prisma.inventoryItem.create({
        data: {
          schoolId,
          name: input.name,
          category: input.category,
          assetTag: input.assetTag ?? null,
          location: input.location ?? null,
          quantity: input.quantity,
          condition: input.condition ?? "GOOD",
          purchasedOn: input.purchasedOn ?? null,
          purchaseCostPkr: input.purchaseCostPkr ?? null,
          notes: input.notes ?? null,
        },
      });
    } catch (error) {
      throw this.translateDuplicateTag(error);
    }
  }

  /**
   * Quantity can't drop below what is already out — the CHECK constraint would
   * refuse it anyway, but a 500 from a violated constraint tells the caller
   * nothing they can act on.
   */
  async updateItem(schoolId: string, id: string, input: UpsertInventoryItemInput) {
    const item = await this.ownItem(schoolId, id);
    if (input.quantity < item.unitsOut) {
      throw new BadRequestException(
        `${item.unitsOut} unit${item.unitsOut === 1 ? "" : "s"} of that are still out — take the quantity no lower than ${item.unitsOut}`,
      );
    }

    try {
      return await this.prisma.inventoryItem.update({
        where: { id },
        data: {
          name: input.name,
          category: input.category,
          assetTag: input.assetTag ?? null,
          location: input.location ?? null,
          quantity: input.quantity,
          ...(input.condition ? { condition: input.condition } : {}),
          purchasedOn: input.purchasedOn ?? null,
          purchaseCostPkr: input.purchaseCostPkr ?? null,
          notes: input.notes ?? null,
        },
      });
    } catch (error) {
      throw this.translateDuplicateTag(error);
    }
  }

  async removeItem(schoolId: string, id: string) {
    const item = await this.ownItem(schoolId, id);
    if (item.unitsOut > 0) {
      throw new BadRequestException(
        "Some of that is still out — get it back before deleting the item",
      );
    }
    await this.prisma.inventoryItem.delete({ where: { id } });
  }

  async listItems(
    schoolId: string,
    filters: { category?: string; search?: string; onlyAvailable?: boolean } = {},
  ) {
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        schoolId,
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: "insensitive" } },
                { assetTag: { contains: filters.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    const withAvailability = items.map((item) => ({
      ...item,
      purchaseCostPkr: item.purchaseCostPkr === null ? null : Number(item.purchaseCostPkr),
      available: item.quantity - item.unitsOut,
      issuable: !UNISSUABLE.includes(item.condition) && item.quantity - item.unitsOut > 0,
    }));

    return filters.onlyAvailable
      ? withAvailability.filter((item) => item.issuable)
      : withAvailability;
  }

  async itemDetail(schoolId: string, id: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, schoolId },
      include: {
        assignments: {
          orderBy: [{ returnedAt: "asc" }, { assignedAt: "desc" }],
          include: ASSIGNMENT_INCLUDE,
        },
      },
    });
    if (!item) throw new NotFoundException("Item not found");

    return {
      ...item,
      purchaseCostPkr: item.purchaseCostPkr === null ? null : Number(item.purchaseCostPkr),
      available: item.quantity - item.unitsOut,
      out: item.assignments.filter((assignment) => assignment.returnedAt === null),
      history: item.assignments.filter((assignment) => assignment.returnedAt !== null),
    };
  }

  /** The categories actually in use, for a filter that offers no dead ends. */
  async categories(schoolId: string) {
    const rows = await this.prisma.inventoryItem.findMany({
      where: { schoolId },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    });
    return rows.map((row) => row.category);
  }

  // ---------- issue and return ----------

  /**
   * Issues units of an item.
   *
   * The availability check and the reservation are one statement, on purpose.
   * Reading `unitsOut` and then writing it back — even inside a transaction —
   * doesn't stop a concurrent issue at Postgres' default READ COMMITTED
   * isolation: both callers read the same figure and both write. Putting
   * `"unitsOut" + $units <= "quantity"` in the WHERE clause makes the database
   * decide, and an affected-row count of zero means someone got there first.
   */
  async issue(schoolId: string, itemId: string, input: IssueAssetInput) {
    const item = await this.ownItem(schoolId, itemId);
    if (UNISSUABLE.includes(item.condition)) {
      throw new BadRequestException(
        `That item is marked ${item.condition.toLowerCase().replace("_", " ")} — it can't be issued`,
      );
    }
    await this.assertHolder(schoolId, input);

    const units = input.units ?? 1;

    return this.prisma.$transaction(async (tx) => {
      const reserved = await tx.$executeRaw`
        UPDATE "InventoryItem"
        SET "unitsOut" = "unitsOut" + ${units}, "updatedAt" = NOW()
        WHERE "id" = ${itemId}
          AND "schoolId" = ${schoolId}
          AND "unitsOut" + ${units} <= "quantity"
      `;
      if (reserved === 0) {
        // Re-read only to make the message useful; the decision was the
        // database's and is already made.
        const current = await tx.inventoryItem.findUnique({
          where: { id: itemId },
          select: { quantity: true, unitsOut: true },
        });
        const available = current ? current.quantity - current.unitsOut : 0;
        throw new ConflictException(
          available === 0
            ? "None of that is available right now"
            : `Only ${available} available — asked for ${units}`,
        );
      }

      return tx.assetAssignment.create({
        data: {
          schoolId,
          itemId,
          assignedToUserId: input.assignedToUserId ?? null,
          classId: input.classId ?? null,
          units,
          dueBackOn: input.dueBackOn ?? null,
          notes: input.notes ?? null,
        },
        include: ASSIGNMENT_INCLUDE,
      });
    });
  }

  /**
   * Takes units back and records what condition they came back in.
   *
   * The return is claimed the same way: a conditional update on the assignment
   * row, so a double-tapped return can't decrement stock twice.
   */
  async returnAsset(schoolId: string, assignmentId: string, input: ReturnAssetInput) {
    const assignment = await this.prisma.assetAssignment.findFirst({
      where: { id: assignmentId, schoolId },
      select: { id: true, itemId: true, units: true, returnedAt: true },
    });
    if (!assignment) throw new NotFoundException("Assignment not found");
    if (assignment.returnedAt) {
      throw new BadRequestException("That has already been returned");
    }

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.assetAssignment.updateMany({
        where: { id: assignmentId, schoolId, returnedAt: null },
        data: {
          returnedAt: new Date(),
          returnedCondition: input.returnedCondition,
          ...(input.notes ? { notes: input.notes } : {}),
        },
      });
      if (claimed.count === 0) {
        throw new BadRequestException("That has already been returned");
      }

      await tx.$executeRaw`
        UPDATE "InventoryItem"
        SET "unitsOut" = "unitsOut" - ${assignment.units}, "updatedAt" = NOW()
        WHERE "id" = ${assignment.itemId}
          AND "unitsOut" - ${assignment.units} >= 0
      `;

      // Damage found on return becomes the item's condition, so the next
      // person to look at the list sees it without opening the history.
      if (UNISSUABLE.includes(input.returnedCondition)) {
        await tx.inventoryItem.update({
          where: { id: assignment.itemId },
          data: { condition: input.returnedCondition },
        });
      }

      return tx.assetAssignment.findUniqueOrThrow({
        where: { id: assignmentId },
        include: ASSIGNMENT_INCLUDE,
      });
    });
  }

  /** Everything currently out, oldest first — the chase list. */
  outstanding(schoolId: string) {
    return this.prisma.assetAssignment.findMany({
      where: { schoolId, returnedAt: null },
      orderBy: [{ dueBackOn: "asc" }, { assignedAt: "asc" }],
      include: ASSIGNMENT_INCLUDE,
    });
  }

  async summary(schoolId: string): Promise<InventorySummary> {
    const [items, overdue] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: { schoolId },
        select: {
          category: true,
          quantity: true,
          unitsOut: true,
          condition: true,
          purchaseCostPkr: true,
        },
      }),
      this.prisma.assetAssignment.count({
        where: { schoolId, returnedAt: null, dueBackOn: { lt: new Date() } },
      }),
    ]);

    const categories = new Map<string, { items: number; units: number; unitsOut: number }>();
    for (const item of items) {
      const bucket = categories.get(item.category) ?? { items: 0, units: 0, unitsOut: 0 };
      bucket.items += 1;
      bucket.units += item.quantity;
      bucket.unitsOut += item.unitsOut;
      categories.set(item.category, bucket);
    }

    return {
      items: items.length,
      units: items.reduce((sum, item) => sum + item.quantity, 0),
      unitsOut: items.reduce((sum, item) => sum + item.unitsOut, 0),
      needsAttention: items.filter((item) => UNISSUABLE.includes(item.condition)).length,
      overdue,
      // Cost is per unit as recorded, so the estate's value is cost × held.
      totalValuePkr: items.reduce(
        (sum, item) => sum + Number(item.purchaseCostPkr ?? 0) * item.quantity,
        0,
      ),
      byCategory: [...categories.entries()]
        .map(([category, bucket]) => ({ category, ...bucket }))
        .sort((a, b) => a.category.localeCompare(b.category)),
    };
  }

  // ---------- internals ----------

  private async ownItem(schoolId: string, id: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, schoolId },
      select: { id: true, quantity: true, unitsOut: true, condition: true, name: true },
    });
    if (!item) throw new NotFoundException("Item not found");
    return item;
  }

  /**
   * The holder must be in the same school. The foreign key alone would accept
   * another tenant's user or class id.
   */
  private async assertHolder(schoolId: string, input: IssueAssetInput) {
    if (input.assignedToUserId) {
      const holder = await this.prisma.user.findFirst({
        where: { id: input.assignedToUserId, schoolId },
        select: { id: true },
      });
      if (!holder) throw new NotFoundException("Staff member not found");
      return;
    }
    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id: input.classId, schoolId },
      select: { id: true },
    });
    if (!schoolClass) throw new NotFoundException("Class not found");
  }

  private translateDuplicateTag(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return new ConflictException("Another item already carries that asset tag");
    }
    return error;
  }
}
