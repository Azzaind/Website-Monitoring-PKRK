ALTER TABLE "Sensor" ADD COLUMN "accessLevel" TEXT NOT NULL DEFAULT 'PUBLIC';
UPDATE "Sensor" SET "accessLevel" = 'ADMIN' WHERE "name" IN ('solar_voltage', 'solar_current');
CREATE INDEX "Sensor_accessLevel_idx" ON "Sensor"("accessLevel");
