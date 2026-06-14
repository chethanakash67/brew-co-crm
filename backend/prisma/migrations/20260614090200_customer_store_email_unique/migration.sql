DROP INDEX IF EXISTS "customers_email_key";

CREATE UNIQUE INDEX IF NOT EXISTS "customers_storeid_email_key" ON "customers"("storeid", "email");
