-- inventory
--
-- Every new table needs RLS enabled to match the stance set in
-- 005_enable_row_level_security: Supabase auto-exposes public
-- tables through PostgREST, and a table without RLS is readable by anyone
-- holding the anon key. Prisma's connection role has BYPASSRLS, so this does
-- not affect the API.

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'WRITTEN_OFF');

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "assetTag" TEXT,
    "location" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitsOut" INTEGER NOT NULL DEFAULT 0,
    "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "purchasedOn" TIMESTAMP(3),
    "purchaseCostPkr" DECIMAL(12,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetAssignment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "classId" TEXT,
    "units" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueBackOn" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "returnedCondition" "AssetCondition",
    "notes" TEXT,

    CONSTRAINT "AssetAssignment_pkey" PRIMARY KEY ("id")
);

-- Nulls are distinct in Postgres, so items without a physical label never
-- collide with each other.
CREATE UNIQUE INDEX "InventoryItem_schoolId_assetTag_key" ON "InventoryItem"("schoolId", "assetTag");

-- CreateIndex
CREATE INDEX "InventoryItem_schoolId_category_idx" ON "InventoryItem"("schoolId", "category");

-- CreateIndex
CREATE INDEX "AssetAssignment_schoolId_idx" ON "AssetAssignment"("schoolId");

-- "What is still out for this item" is the query the issue path runs.
CREATE INDEX "AssetAssignment_itemId_returnedAt_idx" ON "AssetAssignment"("itemId", "returnedAt");

-- CreateIndex
CREATE INDEX "AssetAssignment_assignedToUserId_idx" ON "AssetAssignment"("assignedToUserId");

-- The stock invariant, held by the database rather than by the service.
-- `unitsOut` is denormalised so issuing can be one conditional UPDATE that
-- Postgres arbitrates; this CHECK is what stops a future writer that skips the
-- service from leaving the column outside its own bounds.
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_unitsOut_within_quantity"
    CHECK ("unitsOut" >= 0 AND "unitsOut" <= "quantity");

-- Units are only ever a positive count.
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_quantity_positive"
    CHECK ("quantity" >= 0);
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_units_positive"
    CHECK ("units" > 0);

-- Exactly one holder. "Both" describes nobody accountable, and "neither" loses
-- track of the item entirely.
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_one_holder"
    CHECK (("assignedToUserId" IS NULL) <> ("classId" IS NULL));

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RESTRICT rather than SET NULL on both holders, deliberately. SET NULL would
-- blank the surviving column and then violate the one-holder CHECK above, so
-- deleting a user or a class would fail with a constraint error nobody could
-- act on. RESTRICT fails for a reason the caller can fix: return the item
-- first. Neither has a delete endpoint today, so this changes no behaviour —
-- it just stops the pair becoming a trap for whoever adds one.
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssetAssignment" ENABLE ROW LEVEL SECURITY;
