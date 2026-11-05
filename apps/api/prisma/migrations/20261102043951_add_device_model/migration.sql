/*
  Warnings:

  - You are about to drop the column `apiKeyHash` on the `Sensor` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[deviceId,name]` on the table `Sensor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalId]` on the table `SensorReading` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `deviceId` to the `Sensor` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Sensor_apiKeyHash_key";

-- DropIndex
DROP INDEX "Sensor_name_key";

-- AlterTable
ALTER TABLE "Sensor" DROP COLUMN "apiKeyHash",
ADD COLUMN     "deviceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SensorReading" ADD COLUMN     "externalId" TEXT;

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_name_key" ON "Device"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Device_apiKeyHash_key" ON "Device"("apiKeyHash");

-- CreateIndex
CREATE INDEX "Sensor_deviceId_idx" ON "Sensor"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Sensor_deviceId_name_key" ON "Sensor"("deviceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SensorReading_externalId_key" ON "SensorReading"("externalId");

-- AddForeignKey
ALTER TABLE "Sensor" ADD CONSTRAINT "Sensor_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
