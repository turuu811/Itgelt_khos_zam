-- Add the latest oil-change date to vehicles.
ALTER TABLE "Vehicle" ADD COLUMN "lastOilChangeAt" TIMESTAMP(3);

-- Store one GIT fee record per vehicle and month.
CREATE TABLE "GitFeeRecord" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "numberIssued" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,

    CONSTRAINT "GitFeeRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GitFeeRecord_vehicleId_year_month_key" ON "GitFeeRecord"("vehicleId", "year", "month");
CREATE INDEX "GitFeeRecord_year_month_idx" ON "GitFeeRecord"("year", "month");
CREATE INDEX "GitFeeRecord_customerId_idx" ON "GitFeeRecord"("customerId");
CREATE INDEX "GitFeeRecord_isPaid_year_month_idx" ON "GitFeeRecord"("isPaid", "year", "month");

ALTER TABLE "GitFeeRecord" ADD CONSTRAINT "GitFeeRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GitFeeRecord" ADD CONSTRAINT "GitFeeRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
