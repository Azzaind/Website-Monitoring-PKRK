
const BASE_URL = "http://localhost:3000/api";
const DEVICE_ID = "cmw0s8l580000mcivkdi0hq13";

const tests = [
  {
    name: "Riwayat sensor tanpa token",
    method: "GET",
    path: "/history?sensorName=ph&startDate=2026-11-01&endDate=2026-11-06",
    expected: 401,
  },
  {
    name: "GPS terbaru tanpa token",
    method: "GET",
    path: "/locations/latest",
    expected: 200,
  },
  {
    name: "Riwayat GPS tanpa token",
    method: "GET",
    path: `/locations/history?deviceId=${DEVICE_ID}&startDate=2026-11-01&endDate=2026-11-06`,
    expected: 200,
  },
  {
    name: "Status geofence tanpa token",
    method: "GET",
    path: `/locations/status?deviceId=${DEVICE_ID}`,
    expected: 200,
  },
  {
    name: "Konfigurasi geofence tanpa token",
    method: "PATCH",
    path: "/locations/geofence",
    expected: 401,
    body: {
      deviceId: DEVICE_ID,
      latitude: -7.2575,
      longitude: 112.7521,
      geofenceRadius: 100,
    },
  },
];

async function main() {
  let failed = 0;

  for (const test of tests) {
    try {
      const response = await fetch(`${BASE_URL}${test.path}`, {
        method: test.method,
        headers: {
          "Content-Type": "application/json",
        },
        ...(test.body ? { body: JSON.stringify(test.body) } : {}),
      });

      const passed = response.status === test.expected;

      console.log(
        `${passed ? "BERHASIL" : "GAGAL"} | ${test.name} | HTTP ${response.status} | Expected ${test.expected}`
      );

      if (!passed) failed++;
    } catch (error) {
      failed++;
      console.log(`GAGAL | ${test.name} | ${String(error)}`);
    }
  }

  console.log(`\nTotal gagal: ${failed}/${tests.length}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
