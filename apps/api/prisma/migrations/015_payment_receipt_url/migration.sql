-- payment_receipt_url
--
-- Adds the URL of the rendered fee receipt. Nullable: a receipt only exists
-- once a submission is verified, and back-filling one for historic verified
-- payments would mean rendering documents for records nobody asked for.
-- Existing rows keep NULL and render on next request if ever needed.
--
-- No new table, so no RLS change — PaymentSubmission already has it enabled
-- from 005_enable_row_level_security.

ALTER TABLE "PaymentSubmission" ADD COLUMN "receiptUrl" TEXT;
