import "dotenv/config";

const BASE_URL = "http://localhost:3000";

async function main() {
  // 1. Login admin
  const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });

  const loginData = await loginResponse.json();

  if (!loginResponse.ok || !loginData.data?.token) {
    throw new Error("Login admin gagal");
  }

  const token = loginData.data.token;
  console.log("Login admin: BERHASIL");

  // 2. Uji Excel dan CSV
  for (const format of ["excel", "csv"]) {
    const url = new URL(`${BASE_URL}/api/export/${format}`);
    url.searchParams.set("sensorName", "all");
    url.searchParams.set("startDate", "2026-11-05");
    url.searchParams.set("endDate", "2026-11-05");

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      console.log(`${format.toUpperCase()}: GAGAL`, response.status);
      console.log(await response.text());
      continue;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = `test-export-${format}.${format === "excel" ? "xlsx" : "csv"}`;

    const fs = await import("node:fs/promises");
    await fs.writeFile(filename, buffer);

    console.log(`${format.toUpperCase()}: BERHASIL`);
    console.log(`File: ${filename}`);
    console.log(`Ukuran: ${buffer.length} bytes`);
  }
}

main().catch(console.error);