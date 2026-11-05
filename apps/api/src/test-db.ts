
import { prisma } from "./config/database";

async function main() {
  console.log("Testing PostgreSQL connection...");

  await prisma.$connect();

  const sensorCount = await prisma.sensor.count();
  const readingCount = await prisma.sensorReading.count();

  console.log("Database connection successful!");
  console.log("Total sensors:", sensorCount);
  console.log("Total readings:", readingCount);
}

main()
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
