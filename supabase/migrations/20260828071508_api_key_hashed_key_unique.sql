-- api_key_hashed_key_unique
--
-- Every request authenticated with an API key looks the key up by its SHA-256
-- hash. Without an index that's a sequential scan of ApiKey on each call.
-- Unique rather than a plain index: the hash of a 24-byte random key is
-- unique by construction, and the constraint makes that guarantee explicit
-- so the lookup can never match two rows.

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_hashedKey_key" ON "ApiKey"("hashedKey");
