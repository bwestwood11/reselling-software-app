-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "soldPrice" DECIMAL(10,2),
ADD COLUMN     "soldAt" TIMESTAMP(3),
ADD COLUMN     "soldVia" TEXT,
ADD COLUMN     "soldNote" TEXT;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "soldPrice" DECIMAL(10,2);
