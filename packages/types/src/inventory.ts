import { z } from "zod";

export const assetConditionSchema = z.enum([
  "NEW",
  "GOOD",
  "FAIR",
  "POOR",
  "DAMAGED",
  "WRITTEN_OFF",
]);
export type AssetCondition = z.infer<typeof assetConditionSchema>;

export const ASSET_CONDITION_LABELS: Record<AssetCondition, string> = {
  NEW: "New",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
  DAMAGED: "Damaged",
  WRITTEN_OFF: "Written off",
};

export const inventoryItemSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  name: z.string(),
  category: z.string(),
  assetTag: z.string().nullable(),
  location: z.string().nullable(),
  quantity: z.number().int(),
  unitsOut: z.number().int(),
  condition: assetConditionSchema,
  purchasedOn: z.coerce.date().nullable(),
  purchaseCostPkr: z.coerce.number().nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type InventoryItem = z.infer<typeof inventoryItemSchema>;

export const assetAssignmentSchema = z.object({
  id: z.string().uuid(),
  schoolId: z.string().uuid(),
  itemId: z.string().uuid(),
  assignedToUserId: z.string().uuid().nullable(),
  classId: z.string().uuid().nullable(),
  units: z.number().int(),
  assignedAt: z.coerce.date(),
  dueBackOn: z.coerce.date().nullable(),
  returnedAt: z.coerce.date().nullable(),
  returnedCondition: assetConditionSchema.nullable(),
  notes: z.string().nullable(),
});
export type AssetAssignment = z.infer<typeof assetAssignmentSchema>;

export const upsertInventoryItemSchema = z.object({
  name: z.string().min(1).max(140),
  category: z.string().min(1).max(60),
  assetTag: z.string().min(1).max(60).nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  quantity: z.number().int().min(0).max(100_000),
  condition: assetConditionSchema.optional(),
  purchasedOn: z.coerce.date().nullable().optional(),
  purchaseCostPkr: z.number().min(0).max(1_000_000_000).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});
export type UpsertInventoryItemInput = z.infer<typeof upsertInventoryItemSchema>;

/**
 * Exactly one holder. "Both" describes nobody accountable, and "neither" loses
 * the item entirely — the same rule the database's one-holder CHECK enforces,
 * stated here so the client gets a readable message instead of a 500.
 */
export const issueAssetSchema = z
  .object({
    assignedToUserId: z.string().uuid().optional(),
    classId: z.string().uuid().optional(),
    units: z.number().int().min(1).max(100_000).default(1),
    dueBackOn: z.coerce.date().optional(),
    notes: z.string().max(500).optional(),
  })
  .refine(
    (input) => Boolean(input.assignedToUserId) !== Boolean(input.classId),
    {
      message: "Issue to a staff member or to a class, not both and not neither",
      path: ["assignedToUserId"],
    },
  );
export type IssueAssetInput = z.infer<typeof issueAssetSchema>;

export const returnAssetSchema = z.object({
  /** Asked on return, not on issue — the point is to notice damage. */
  returnedCondition: assetConditionSchema,
  notes: z.string().max(500).optional(),
});
export type ReturnAssetInput = z.infer<typeof returnAssetSchema>;

export interface InventorySummary {
  items: number;
  units: number;
  unitsOut: number;
  /** Items whose condition means they shouldn't be issued again. */
  needsAttention: number;
  /** Assignments past their due-back date and not returned. */
  overdue: number;
  totalValuePkr: number;
  byCategory: {
    category: string;
    items: number;
    units: number;
    unitsOut: number;
  }[];
}
