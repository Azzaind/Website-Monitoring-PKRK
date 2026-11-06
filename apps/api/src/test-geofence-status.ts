import "dotenv/config";

async function main() {
  const login = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });

  const loginData = await login.json();
  const token = loginData.data?.token;

  if (!login.ok || !token) {
    throw new Error("Admin login failed");
  }

  const params = new URLSearchParams({
    deviceId: process.env.TEST_DEVICE_ID!,
  });

  const response = await fetch(
    `http://localhost:3000/api/locations/status?${params}`,
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