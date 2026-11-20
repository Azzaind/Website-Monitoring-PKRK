export const API_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3000";

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  "ws://localhost:3000";

// Mode mock hanya aktif jika NEXT_PUBLIC_MOCK="true". Secara default terhubung langsung ke Backend.
export const MOCK = process.env.NEXT_PUBLIC_MOCK === "true";

export const DEMO = { email: "admin@pkrk.test", password: "admin123" };
