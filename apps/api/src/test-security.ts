import jwt from "jsonwebtoken";
import "dotenv/config";
import { prisma } from "./config/database";

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

    // Token valid secara kriptografis, tetapi role bukan admin
    const nonAdminToken = jwt.sign(
      {
        userId: "non-admin-test",
        role: "user",
      },
      process.env.JWT_SECRET!,
      { expiresIn: "5m" }
    );
  
    await test(
      "Sensor history dengan token role user",
      () => fetch(
        `${BASE_URL}/api/history?sensorName=ph&startDate=2026-11-05&endDate=2026-11-05`,
        {
          headers: {
            Authorization: `Bearer ${nonAdminToken}`,
          },
        }
      ),
      [403]
    );

  // 1. Dashboard publik
  await test(
    "Dashboard tanpa token",
    () => fetch(`${BASE_URL}/api/dashboard/overview`),
    [200]
  );

  // 2. GPS latest publik
  await test(
    "GPS latest tanpa token",
    () => fetch(`${BASE_URL}/api/locations/latest`),
    [200]
  );

  // 3. GPS history publik
  await test(
    "GPS history tanpa token",
    () => fetch(
      `${BASE_URL}/api/locations/history?deviceId=${process.env.TEST_DEVICE_ID}&startDate=2026-11-05&endDate=2026-11-05`
    ),
    [200]
  );

  // 4. Geofence status publik
  await test(
    "Geofence status tanpa token",
    () => fetch(
      `${BASE_URL}/api/locations/status?deviceId=${process.env.TEST_DEVICE_ID}`
    ),
    [200]
  );

  // 5. Riwayat sensor harus ditolak tanpa token
  await test(
    "Sensor history tanpa token",
    () => fetch(
      `${BASE_URL}/api/history?sensorName=ph&startDate=2026-11-05&endDate=2026-11-05`
    ),
    [401, 403]
  );

  // 6. Konfigurasi geofence harus ditolak tanpa token
  await test(
    "Geofence configuration tanpa token",
    () => fetch(`${BASE_URL}/api/locations/geofence`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }),
    [401, 403]
  );

  // 7. Export harus ditolak tanpa token
  await test(
    "Export tanpa token",
    () => fetch(
      `${BASE_URL}/api/export/excel?sensorName=all&startDate=2026-11-05&endDate=2026-11-05`
    ),
    [401, 403]
  );

  // 8. Admin dapat mengakses sensor history
  await test(
    "Sensor history dengan token admin",
    () => fetch(
      `${BASE_URL}/api/history?sensorName=ph&startDate=2026-11-05&endDate=2026-11-05`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    ),
    [200]
  );

  // 9. Admin dapat mengakses export
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

    // 10. Admin dapat menyimpan konfigurasi geofence tanpa mengubah nilainya
    const device = await prisma.device.findUnique({
      where: { id: process.env.TEST_DEVICE_ID },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        geofenceRadius: true,
      },
    });
  
    if (
      device &&
      device.latitude !== null &&
      device.longitude !== null &&
      device.geofenceRadius !== null
    ) {
      await test(
        "Geofence configuration dengan token admin",
        () => fetch(`${BASE_URL}/api/locations/geofence`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            deviceId: device.id,
            latitude: Number(device.latitude),
            longitude: Number(device.longitude),
            radiusMeters: Number(device.geofenceRadius),
          }),
        }),
        [200]
      );
    } else {
      failedTests++;
      console.log("GAGAL | Geofence configuration admin | Konfigurasi perangkat belum tersedia");
    }

  // 11. API key device yang salah harus ditolak
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

  console.log(`\nHasil: ${failedTests === 0 ? "SEMUA LOLOS" : `${failedTests} PENGUJIAN GAGAL`}`);
  console.log("Total pengujian: 12");

  await prisma.$disconnect();
  process.exitCode = failedTests > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error("Pengujian gagal dijalankan:", error);
  process.exitCode = 1;
});
