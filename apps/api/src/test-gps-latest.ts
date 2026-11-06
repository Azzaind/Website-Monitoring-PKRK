import "dotenv/config";

async function main() {
  const loginResponse = await fetch(
    "http://localhost:3000/api/auth/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      }),
    }
  );

  const loginData = await loginResponse.json();

  if (!loginResponse.ok) {
    throw new Error(`Login gagal: ${JSON.stringify(loginData)}`);
  }

  const token = loginData.data?.token;

  if (!token) {
    throw new Error("JWT tidak ditemukan dalam respons login.");
  }

  console.log("Login admin berhasil.");

  const response = await fetch(
    "http://localhost:3000/api/locations/latest",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const result = await response.json();

  console.log(
    JSON.stringify(result, null, 2)
  );
}

main().catch(console.error);
