import { API_URL, MOCK, DEMO } from "./config";

export interface Sensor { id: string; name: string; unit: string; isActive?: boolean }
export interface Reading { id: string; value: number; recordedAt: string; receivedAt: string; externalId: string | null }
export interface LatestSensor extends Sensor { readings: Reading[] }
export interface HistoryRes { sensor: { name: string; unit: string }; totalRecords: number; data: Reading[] }

/* ---------- Token admin ---------- */
const KEY = "pkrk_admin_token";
export const auth = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(KEY)),
  set: (t: string) => localStorage.setItem(KEY, t),
  clear: () => localStorage.removeItem(KEY),
  valid(): boolean {
    const t = this.get();
    if (!t) return false;
    if (t === "mock-token") return true;
    try {
      const p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return p.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },
};

export const errText = (e: unknown) => {
  const m = e instanceof Error ? e.message : "";
  if (/fetch|network/i.test(m)) return "BE tidak dapat dihubungi. Pastikan server berjalan.";
  if (/invalid email|invalid password/i.test(m)) return "Email atau kata sandi salah. Periksa lalu coba lagi.";
  return m || "Terjadi kesalahan. Coba lagi.";
};

/* ---------- Data simulasi (NEXT_PUBLIC_MOCK=true) ---------- */
export const mockSensors: Sensor[] = [
  { id: "1", name: "Suhu", unit: "°C" },
  { id: "2", name: "Oksigen Terlarut", unit: "mg/L" },
  { id: "3", name: "pH", unit: "pH" },
  { id: "4", name: "Salinitas", unit: "ppt" },
  { id: "5", name: "Kekeruhan", unit: "NTU" },
  { id: "6", name: "Level Air", unit: "cm" },
];
const SHAPE = [[28.5, 1.5], [6.2, 1], [8, 0.4], [20, 3], [12.8, 0.4], [95, 8]];
export function mockValue(i: number, t = Date.now()) {
  const [b, a] = SHAPE[i];
  return +(b + a * Math.sin(t / 5.4e6 + i) + (Math.random() - 0.5) * a * 0.2).toFixed(2);
}
const mockReading = (i: number, t: number): Reading => ({
  id: `m${i}-${t}`,
  value: mockValue(i, t),
  recordedAt: new Date(t).toISOString(),
  receivedAt: new Date(t).toISOString(),
  externalId: null,
});

/* ---------- Pemanggilan BE ---------- */
async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message ?? `Permintaan gagal (${res.status})`);
  return body as T;
}

export async function getSensors(): Promise<Sensor[]> {
  if (MOCK) return mockSensors;
  return (await http<{ data: Sensor[] }>("/api/sensors")).data;
}

export async function getLatest(): Promise<LatestSensor[]> {
  if (MOCK) return mockSensors.map((s, i) => ({ ...s, readings: [mockReading(i, Date.now())] }));
  return (await http<{ data: LatestSensor[] }>("/api/sensors/latest")).data;
}

export async function login(email: string, password: string) {
  if (MOCK) {
    if (email === DEMO.email && password === DEMO.password) return auth.set("mock-token");
    throw new Error("Invalid email or password");
  }
  const r = await http<{ data: { token: string } }>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  auth.set(r.data.token);
}

export async function getHistory(name: string, start: string, end: string): Promise<HistoryRes> {
  if (MOCK) {
    const i = mockSensors.findIndex((s) => s.name === name);
    const a = new Date(`${start}T00:00:00+07:00`).getTime();
    const b = Math.min(new Date(`${end}T23:59:59+07:00`).getTime(), Date.now());
    const data: Reading[] = [];
    for (let t = a; i >= 0 && t <= b && data.length < 5000; t += 30 * 60 * 1000) data.push(mockReading(i, t));
    return { sensor: { name, unit: mockSensors[i]?.unit ?? "" }, totalRecords: data.length, data };
  }
  const q = new URLSearchParams({ sensorName: name, startDate: start, endDate: end });
  return http<HistoryRes>(`/api/history?${q}`);
}

const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export async function downloadCsv(name: string, start: string, end: string) {
  let blob: Blob;
  if (MOCK) {
    const h = await getHistory(name, start, end);
    const wib = (s: string) => new Date(s).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const rows = [
      ["No", "Sensor", "Value", "Unit", "Recorded At (WIB)", "Received At (WIB)", "External ID"].map(esc).join(","),
      ...h.data.map((r, k) => [k + 1, name, r.value, h.sensor.unit, wib(r.recordedAt), wib(r.receivedAt), r.externalId ?? ""].map(esc).join(",")),
    ];
    blob = new Blob(["\uFEFF" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
  } else {
    const q = new URLSearchParams({ sensorName: name, startDate: start, endDate: end });
    const res = await fetch(`${API_URL}/api/export/csv?${q}`, { headers: { Authorization: `Bearer ${auth.get()}` } });
    if (res.status === 401 || res.status === 403) {
      auth.clear();
      throw new Error("UNAUTHORIZED");
    }
    if (!res.ok) throw new Error("Unduhan gagal. Coba lagi.");
    blob = await res.blob();
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}_${start}_${end}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}