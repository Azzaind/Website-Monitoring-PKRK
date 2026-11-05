
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL belum ditemukan di .env");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Membuat perangkat atau mengambil perangkat yang sudah ada
  const apiKey = randomBytes(32).toString("hex");
  const apiKeyHash = await bcrypt.hash(apiKey, 12);
  const device = await prisma.device.upsert({
    where: { name: "device_001" },
    update: {
      apiKeyHash: apiKeyHash,
    },
    create: {
      name: "device_001",
      apiKeyHash: apiKeyHash,
    },
  });

  // Mendaftarkan tiga sensor sementara
  const sensors = [
    { name: "sensor_1", unit: "unit_1" },
    { name: "sensor_2", unit: "unit_2" },
    { name: "sensor_3", unit: "unit_3" },
  ];

  for (const sensor of sensors) {
    await prisma.sensor.upsert({
      where: {
        deviceId_name: {
          deviceId: device.id,
          name: sensor.name,
        },
      },
      update: { unit: sensor.unit },
      create: {
        deviceId: device.id,
        name: sensor.name,
        unit: sensor.unit,
      },
    });
  }
  console.log("API Key:", apiKey);
  console.log("Device and sensors successfully registered!");
  console.log("Device ID:", device.id);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });