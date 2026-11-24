export {};
const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function request(path: string, token?: string) {
  return fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Set ADMIN_EMAIL dan ADMIN_PASSWORD di environment untuk menjalankan test.");
  }
  const login = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const loginBody = await login.json() as { data?: { token?: string } };
  const token = loginBody.data?.token;
  if (!login.ok || !token) throw new Error("Login admin gagal.");

  const [publicSensorsResponse, adminSensorsResponse, publicLatestResponse, adminLatestResponse] =
    await Promise.all([
      request("/api/sensors"),
      request("/api/sensors", token),
      request("/api/sensors/latest"),
      request("/api/sensors/latest", token),
    ]);

  for (const [label, response] of [
    ["Public sensors", publicSensorsResponse],
    ["Admin sensors", adminSensorsResponse],
    ["Public latest", publicLatestResponse],
    ["Admin latest", adminLatestResponse],
  ] as const) {
    if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`);
  }

  const publicSensors = await publicSensorsResponse.json() as { data: { name: string }[] };
  const adminSensors = await adminSensorsResponse.json() as { data: { name: string }[] };
  const publicNames = new Set(publicSensors.data.map((sensor) => sensor.name));
  const adminNames = new Set(adminSensors.data.map((sensor) => sensor.name));

  for (const restricted of ["solar_voltage", "solar_current"]) {
    if (publicNames.has(restricted)) throw new Error(`GAGAL: ${restricted} terlihat oleh publik.`);
    if (!adminNames.has(restricted)) throw new Error(`GAGAL: ${restricted} tidak terlihat oleh admin.`);
  }
  for (const publicName of ["water_level", "solar_power"]) {
    if (!publicNames.has(publicName)) throw new Error(`GAGAL: ${publicName} tidak terlihat oleh publik.`);
    if (!adminNames.has(publicName)) throw new Error(`GAGAL: ${publicName} tidak terlihat oleh admin.`);
  }

  const [publicDashboardResponse, adminDashboardResponse] = await Promise.all([
    request("/api/dashboard/overview"),
    request("/api/dashboard/overview", token),
  ]);
  if (!publicDashboardResponse.ok || !adminDashboardResponse.ok) {
    throw new Error("Dashboard overview gagal diakses.");
  }
  const publicDashboard = await publicDashboardResponse.json() as { data: { sensors: { name: string }[] }[] };
  const adminDashboard = await adminDashboardResponse.json() as { data: { sensors: { name: string }[] }[] };
  const publicDashboardNames = new Set(publicDashboard.data.flatMap((device) => device.sensors.map((sensor) => sensor.name)));
  const adminDashboardNames = new Set(adminDashboard.data.flatMap((device) => device.sensors.map((sensor) => sensor.name)));
  for (const restricted of ["solar_voltage", "solar_current"]) {
    if (publicDashboardNames.has(restricted)) throw new Error(`GAGAL: dashboard publik membocorkan ${restricted}.`);
    if (!adminDashboardNames.has(restricted)) throw new Error(`GAGAL: dashboard admin tidak menampilkan ${restricted}.`);
  }

  const publicHistory = await request(
    "/api/history?sensorName=solar_voltage&startDate=2026-01-01&endDate=2026-12-31"
  );
  const adminHistory = await request(
    "/api/history?sensorName=solar_voltage&startDate=2026-01-01&endDate=2026-12-31",
    token
  );
  if (publicHistory.status !== 404) throw new Error(`Public restricted history seharusnya 404, mendapat ${publicHistory.status}.`);
  if (!adminHistory.ok) throw new Error(`Admin history gagal: HTTP ${adminHistory.status}.`);

  const publicExport = await request("/api/export/csv?sensorName=all&startDate=2026-01-01&endDate=2026-12-31");
  if (publicExport.status !== 401) throw new Error(`Public export seharusnya 401, mendapat ${publicExport.status}.`);

  console.log("PASS: pembatasan sensor, riwayat, dan ekspor.");
  console.log(`Sensor publik: ${publicNames.size}; sensor admin: ${adminNames.size}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
