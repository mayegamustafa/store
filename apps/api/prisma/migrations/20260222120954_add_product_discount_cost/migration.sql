-- AlterTable
ALTER TABLE "products" ADD COLUMN     "cost" DECIMAL(12,2),
ADD COLUMN     "discountType" TEXT,
ADD COLUMN     "discountValue" DECIMAL(12,2);
