-- AlterEnum
-- New enum values must be committed in their own transaction before
-- they can be referenced (e.g. as a column default) by a later migration.
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PENDING';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'REJECTED';
