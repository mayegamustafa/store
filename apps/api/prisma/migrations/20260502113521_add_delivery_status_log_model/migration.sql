-- CreateTable
CREATE TABLE "delivery_status_logs" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "note" TEXT,
    "proofPhoto" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_status_logs_deliveryId_createdAt_idx" ON "delivery_status_logs"("deliveryId", "createdAt");

-- AddForeignKey
ALTER TABLE "delivery_status_logs" ADD CONSTRAINT "delivery_status_logs_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_status_logs" ADD CONSTRAINT "delivery_status_logs_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
