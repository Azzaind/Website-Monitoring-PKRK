import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL belum ditemukan di .env");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const name = "Administrator";
  const email = "admin@pkrkabmas.local";
  const password = process.env.ADMIN_PASSWORD;

  if (!password || password.length < 12) {
    throw new Error("ADMIN_PASSWORD harus tersedia dan minimal 12 karakter");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: "admin",
      isActive: true,
    },
    create: {
      name,
      email,
      passwordHash,
      role: "admin",
    },
  });

  console.log("Akun admin berhasil dibuat.");
  console.log("Email:", admin.email);
}

main()
  .catch((error) => {
    console.error("Gagal membuat akun admin:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });