-- sms_channel
--
-- No new tables, so nothing here needs RLS enabling: the stance set in
-- 005_enable_row_level_security already covers "School".

-- Which phone channel a school's alerts go out on.
--
-- A preference rather than a per-call decision, because the two channels are
-- not interchangeable at the point of sending: WhatsApp is effectively free
-- and SMS is billed per message, so "send both" has to be something a school
-- opts into with its eyes open rather than a default that quietly doubles its
-- bill. WHATSAPP keeps every existing school exactly where it was.
CREATE TYPE "PhoneChannel" AS ENUM ('WHATSAPP', 'SMS', 'BOTH');

-- AlterTable
ALTER TABLE "School" ADD COLUMN "phoneChannel" "PhoneChannel" NOT NULL DEFAULT 'WHATSAPP';
