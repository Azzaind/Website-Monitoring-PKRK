import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum ditemukan di .env");
if (!process.env.SEED_DEVICE_ID) {
  throw new Error("Isi SEED_DEVICE_ID dengan ID perangkat yang sudah ada. Seed ini tidak membuat perangkat baru atau mengganti API key.");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const sensors = [
  // Unit sensor existing tidak ditimpa ketika seed dijalankan.
  { name: "ec", unit: "UNCONFIGURED", accessLevel: "PUBLIC" },
  { name: "ph", unit: "UNCONFIGURED", accessLevel: "PUBLIC" },
  { name: "temperature", unit: "UNCONFIGURED", accessLevel: "PUBLIC" },
  { name: "turbidity", unit: "UNCONFIGURED", accessLevel: "PUBLIC" },
  { name: "do", unit: "UNCONFIGURED", accessLevel: "PUBLIC" },
  { name: "water_level", unit: "cm", accessLevel: "PUBLIC" },
  { name: "solar_power", unit: "W", accessLevel: "PUBLIC" },
  { name: "solar_voltage", unit: "V", accessLevel: "ADMIN" },
  { name: "solar_current", unit: "A", accessLevel: "ADMIN" },
] as const;

async function main() {
  const device = await prisma.device.findUnique({ where: { id: process.env.SEED_DEVICE_ID } });
  if (!device || !device.isActive) throw new Error("Device ID tidak ditemukan atau perangkat tidak aktif.");

  for (const sensor of sensors) {
    await prisma.sensor.upsert({
      where: { deviceId_name: { deviceId: device.id, name: sensor.name } },
      update: { accessLevel: sensor.accessLevel },
      create: {
        deviceId: device.id,
        name: sensor.name,
        unit: sensor.unit,
        accessLevel: sensor.accessLevel,
      },
    });
  }

  console.log(`Berhasil memperbarui hak akses 9 sensor untuk device ${device.id}. API key tidak diubah.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
