import "dotenv/config";

const BASE_URL = "http://localhost:3000";
let failedTests = 0;

async function test(
  name: string,
  request: () => Promise<Response>,
  expected: number[]
) {
  try {
    const response = await request();
    const passed = expected.includes(response.status);

    console.log(
      `${passed ? "BERHASIL" : "GAGAL"} | ${name} | HTTP ${response.status}`
    );

    if (!passed) {
      failedTests++;
      console.log(await response.text());
    }
  } catch (error) {
    failedTests++;
    console.log(`ERROR | ${name}`, error);
  }
}

async function main() {
  // Login admin
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
  console.log("Login admin: BERHASIL\n");

  // 1. Dashboard harus bisa diakses publik
  await test(
    "Public dashboard",
    () => fetch(`${BASE_URL}/api/dashboard/overview`),
    [200]
  );

  // 2. Export tidak boleh diakses tanpa token
  await test(
    "Export tanpa token",
    () => fetch(
      `${BASE_URL}/api/export/excel?sensorName=all&startDate=2026-11-05&endDate=2026-11-05`
    ),
    [401, 403]
  );

  // 3. Riwayat GPS tidak boleh diakses tanpa token
  await test(
    "GPS latest tanpa token",
    () => fetch(`${BASE_URL}/api/locations/latest`),
    [401, 403]
  );

  // 4. Admin harus bisa mengakses export
  await test(
    "Export dengan token admin",
    () => fetch(
      `${BASE_URL}/api/export/excel?sensorName=all&startDate=2026-11-05&endDate=2026-11-05`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    ),
    [200]
  );

  // 5. API key device yang salah harus ditolak
  await test(
    "Pengiriman sensor dengan API key salah",
    () => fetch(`${BASE_URL}/api/readings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "INVALID_TEST_API_KEY",
      },
      body: JSON.stringify({
        deviceId: process.env.TEST_DEVICE_ID,
        readings: [],
      }),
    }),
    [401, 403]
  );
}

main().catch(console.error);
process.exitCode = failedTests > 0 ? 1 : 0;