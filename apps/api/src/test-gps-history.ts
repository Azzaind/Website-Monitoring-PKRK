import "dotenv/config";

async function main() {
  const loginResponse = await fetch(
    "http://localhost:3000/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      }),
    }
  );

  const loginData = await loginResponse.json();
  const token = loginData.data?.token;

  if (!loginResponse.ok || !token) {
    throw new Error("Login admin gagal.");
  }

  const params = new URLSearchParams({
    deviceId: process.env.TEST_DEVICE_ID!,
    startDate: "2026-11-05",
    endDate: "2026-11-05",
  });

  const response = await fetch(
    `http://localhost:3000/api/locations/history?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const result = await response.json();

  console.log("HTTP Status:", response.status);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);