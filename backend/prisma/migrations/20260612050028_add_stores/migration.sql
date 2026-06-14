-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "storeid" TEXT;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "storeid" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "storeid" TEXT;

-- AlterTable
ALTER TABLE "segments" ADD COLUMN     "storeid" TEXT;

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaigns_storeid_idx" ON "campaigns"("storeid");

-- CreateIndex
CREATE INDEX "customers_storeid_idx" ON "customers"("storeid");

-- CreateIndex
CREATE INDEX "orders_storeid_idx" ON "orders"("storeid");

-- CreateIndex
CREATE INDEX "segments_storeid_idx" ON "segments"("storeid");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_storeid_fkey" FOREIGN KEY ("storeid") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_storeid_fkey" FOREIGN KEY ("storeid") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segments" ADD CONSTRAINT "segments_storeid_fkey" FOREIGN KEY ("storeid") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_storeid_fkey" FOREIGN KEY ("storeid") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
