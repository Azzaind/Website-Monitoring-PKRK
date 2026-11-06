export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3000";
// Dummy aktif kecuali NEXT_PUBLIC_MOCK=false (isi false jika BE sudah siap)
export const MOCK = process.env.NEXT_PUBLIC_MOCK !== "false";
export const DEMO = { email: "admin@pkrk.test", password: "admin123" };