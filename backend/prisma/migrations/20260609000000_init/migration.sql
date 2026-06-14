CREATE TABLE "customers" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "tier" TEXT NOT NULL,
  "totalspend" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orders" (
  "id" TEXT NOT NULL,
  "customerid" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "items" JSONB NOT NULL,
  "channel" TEXT NOT NULL,
  "orderedat" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "segments" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "sqlquery" TEXT NOT NULL,
  "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "segments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campaigns" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "segmentid" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "communications" (
  "id" TEXT NOT NULL,
  "campaignid" TEXT NOT NULL,
  "customerid" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "sentat" TIMESTAMP(3),
  CONSTRAINT "communications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "receipts" (
  "id" TEXT NOT NULL,
  "communicationid" TEXT NOT NULL,
  "eventtype" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");
CREATE INDEX "customers_city_idx" ON "customers"("city");
CREATE INDEX "customers_tier_idx" ON "customers"("tier");
CREATE INDEX "orders_customerid_idx" ON "orders"("customerid");
CREATE INDEX "orders_orderedat_idx" ON "orders"("orderedat");
CREATE INDEX "campaigns_segmentid_idx" ON "campaigns"("segmentid");
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");
CREATE INDEX "communications_campaignid_idx" ON "communications"("campaignid");
CREATE INDEX "communications_customerid_idx" ON "communications"("customerid");
CREATE INDEX "communications_status_idx" ON "communications"("status");
CREATE INDEX "receipts_communicationid_idx" ON "receipts"("communicationid");
CREATE INDEX "receipts_eventtype_idx" ON "receipts"("eventtype");

ALTER TABLE "orders" ADD CONSTRAINT "orders_customerid_fkey" FOREIGN KEY ("customerid") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_segmentid_fkey" FOREIGN KEY ("segmentid") REFERENCES "segments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communications" ADD CONSTRAINT "communications_campaignid_fkey" FOREIGN KEY ("campaignid") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communications" ADD CONSTRAINT "communications_customerid_fkey" FOREIGN KEY ("customerid") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_communicationid_fkey" FOREIGN KEY ("communicationid") REFERENCES "communications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
