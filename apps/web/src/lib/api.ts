import { API_URL, MOCK, DEMO } from "./config";

export interface Sensor {
  id: string;
  deviceId?: string;
  name: string;
  unit: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface Reading {
  id: string;
  sensorId?: string;
  value: number;
  recordedAt: string;
  receivedAt: string;
  externalId: string | null;
}

export interface LatestSensor extends Sensor {
  readings: Reading[];
}

export interface HistoryRes {
  success?: boolean;
  sensor: { name: string; unit: string };
  totalRecords: number;
  data: Reading[];
}

export interface GpsLocation {
  id?: string;
  deviceId?: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  recordedAt: string;
  receivedAt?: string;
}

export type GeofenceStatus =
  | "SAFE"
  | "ALERT"
  | "GPS_UNCERTAIN"
  | "NO_GPS_DATA"
  | "NOT_CONFIGURED";

export interface DashboardDeviceSensor {
  id: string;
  name: string;
  unit: string;
  latestValue: number | null;
  recordedAt: string | null;
}

export interface DashboardDevice {
  device: {
    id: string;
    name: string;
  };
  sensors: DashboardDeviceSensor[];
  gps: GpsLocation | null;
  geofence: {
    status: GeofenceStatus;
    distanceFromInstallation: number | null;
    radiusMeters: number | null;
  };
}

export interface DashboardOverviewRes {
  success: boolean;
  totalDevices: number;
  data: DashboardDevice[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface GeofenceConfigPayload {
  deviceId: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

/* ---------- Token & Sesi Admin ---------- */
const TOKEN_KEY = "pkrk_admin_token";
const USER_KEY = "pkrk_admin_user";

export const auth = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  getUser: (): AdminUser | null => {
    if (typeof window === "undefined") return null;
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  setUser: (u: AdminUser) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
  clear: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
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
  if (m === "UNAUTHORIZED") return "Sesi admin telah berakhir atau tidak sah. Silakan masuk kembali.";
  if (/fetch|network|failed to fetch|econnrefused/i.test(m)) {
    return "Backend tidak dapat dihubungi. Pastikan server Backend berjalan di " + API_URL;
  }
  if (/invalid email|invalid password|email and password/i.test(m)) {
    return "Email atau kata sandi salah. Periksa lalu coba lagi.";
  }
  return m || "Terjadi kesalahan. Coba lagi.";
};

/* ---------- Data simulasi (saat NEXT_PUBLIC_MOCK=true) ---------- */
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
  const [b, a] = SHAPE[i] ?? [10, 2];
  return +(b + a * Math.sin(t / 5.4e6 + i) + (Math.random() - 0.5) * a * 0.2).toFixed(2);
}

export const mockReading = (i: number, t: number): Reading => ({
  id: `m${i}-${t}`,
  value: mockValue(i, t),
  recordedAt: new Date(t).toISOString(),
  receivedAt: new Date(t).toISOString(),
  externalId: null,
});

/* ---------- Pemanggilan HTTP Backend ---------- */
async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = auth.get();
  const headers = new Headers(init?.headers);

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (res.status === 401 || res.status === 403) {
    if (auth.get()) {
      auth.clear();
      throw new Error("UNAUTHORIZED");
    }
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message ?? `Permintaan gagal (${res.status})`);
  }
  return body as T;
}

/* ---------- 1. Endpoint Sensor & Dashboard (Publik) ---------- */

export async function getSensors(): Promise<Sensor[]> {
  if (MOCK) return mockSensors;
  const res = await http<{ success: boolean; data: Sensor[] }>("/api/sensors");
  return res.data;
}

export async function getLatest(): Promise<LatestSensor[]> {
  if (MOCK) {
    return mockSensors.map((s, i) => ({
      ...s,
      readings: [mockReading(i, Date.now())],
    }));
  }
  const res = await http<{ success: boolean; data: LatestSensor[] }>("/api/sensors/latest");
  return res.data;
}

export async function getDashboardOverview(): Promise<DashboardDevice[]> {
  if (MOCK) {
    return [
      {
        device: { id: "mock-device-1", name: "Tambak Utama" },
        sensors: mockSensors.map((s, i) => ({
          id: s.id,
          name: s.name,
          unit: s.unit,
          latestValue: mockValue(i),
          recordedAt: new Date().toISOString(),
        })),
        gps: {
          latitude: -7.2575,
          longitude: 112.7521,
          accuracyMeters: 8,
          recordedAt: new Date().toISOString(),
        },
        geofence: {
          status: "SAFE",
          distanceFromInstallation: 12.5,
          radiusMeters: 100,
        },
      },
    ];
  }
  const res = await http<DashboardOverviewRes>("/api/dashboard/overview");
  return res.data;
}

/* ---------- 2. Endpoint GPS & Geofence (Publik) ---------- */

export async function getLatestLocations(): Promise<
  Array<{ deviceId: string; deviceName: string; location: GpsLocation | null }>
> {
  if (MOCK) {
    return [
      {
        deviceId: "mock-device-1",
        deviceName: "Tambak Utama",
        location: {
          latitude: -7.2575,
          longitude: 112.7521,
          accuracyMeters: 8,
          recordedAt: new Date().toISOString(),
        },
      },
    ];
  }
  const res = await http<{
    success: boolean;
    data: Array<{ deviceId: string; deviceName: string; location: GpsLocation | null }>;
  }>("/api/locations/latest");
  return res.data;
}

export async function getGeofenceStatus(deviceId: string) {
  if (MOCK) {
    return {
      success: true,
      status: "SAFE" as GeofenceStatus,
      distanceFromInstallation: 12.5,
      geofence: { latitude: -7.2575, longitude: 112.7521, radiusMeters: 100 },
      currentLocation: { latitude: -7.2575, longitude: 112.7521, accuracyMeters: 8, recordedAt: new Date().toISOString() },
    };
  }
  return http<any>(`/api/locations/status?deviceId=${encodeURIComponent(deviceId)}`);
}

export async function getLocationHistory(deviceId: string, startDate: string, endDate: string) {
  if (MOCK) {
    return {
      success: true,
      device: { id: deviceId, name: "Tambak Utama" },
      total: 1,
      data: [
        {
          id: "mock-loc-1",
          deviceId,
          latitude: -7.2575,
          longitude: 112.7521,
          accuracyMeters: 8,
          recordedAt: new Date().toISOString(),
        },
      ],
    };
  }
  const q = new URLSearchParams({ deviceId, startDate, endDate });
  return http<any>(`/api/locations/history?${q}`);
}

/* ---------- 3. Endpoint Admin (Autentikasi & Konfigurasi) ---------- */

export async function login(email: string, password: string) {
  if (MOCK) {
    if (email === DEMO.email && password === DEMO.password) {
      auth.set("mock-token");
      auth.setUser({ id: "mock-admin", name: "Admin Tambak", email: DEMO.email, role: "admin" });
      return;
    }
    throw new Error("Invalid email or password");
  }

  const res = await http<{
    success: boolean;
    message: string;
    data: {
      token: string;
      user: AdminUser;
    };
  }>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  auth.set(res.data.token);
  if (res.data.user) {
    auth.setUser(res.data.user);
  }
  return res.data;
}

export async function updateGeofence(payload: GeofenceConfigPayload) {
  if (MOCK) {
    return { success: true, message: "Geofence tersimpan (simulasi)", data: payload };
  }
  return http<{ success: boolean; message: string; data: any }>("/api/locations/geofence", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getHistory(name: string, start: string, end: string): Promise<HistoryRes> {
  if (MOCK) {
    const i = mockSensors.findIndex((s) => s.name === name);
    const a = new Date(`${start}T00:00:00+07:00`).getTime();
    const b = Math.min(new Date(`${end}T23:59:59+07:00`).getTime(), Date.now());
    const data: Reading[] = [];
    for (let t = a; i >= 0 && t <= b && data.length < 5000; t += 30 * 60 * 1000) {
      data.push(mockReading(i, t));
    }
    return {
      sensor: { name, unit: mockSensors[i]?.unit ?? "" },
      totalRecords: data.length,
      data,
    };
  }

  const q = new URLSearchParams({ sensorName: name, startDate: start, endDate: end });
  return http<HistoryRes>(`/api/history?${q}`);
}

const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export async function downloadCsv(name: string, start: string, end: string) {
  let blob: Blob;
  if (MOCK) {
    const targetName = name === "all" ? (mockSensors[0]?.name ?? "Suhu") : name;
    const h = await getHistory(targetName, start, end);
    const wib = (s: string) => new Date(s).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const rows = [
      ["No", "Sensor", "Value", "Unit", "Recorded At (WIB)", "Received At (WIB)", "External ID"].map(esc).join(","),
      ...h.data.map((r, k) =>
        [k + 1, h.sensor.name, r.value, h.sensor.unit, wib(r.recordedAt), wib(r.receivedAt), r.externalId ?? ""].map(esc).join(",")
      ),
    ];
    blob = new Blob(["\uFEFF" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
  } else {
    const q = new URLSearchParams({ sensorName: name, startDate: start, endDate: end });
    const token = auth.get();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/api/export/csv?${q}`, { headers });
    if (res.status === 401 || res.status === 403) {
      auth.clear();
      throw new Error("UNAUTHORIZED");
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? "Unduhan CSV gagal. Coba lagi.");
    }
    blob = await res.blob();
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}_${start}_${end}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadExcel(name: string, start: string, end: string) {
  let blob: Blob;
  if (MOCK) {
    return downloadCsv(name, start, end);
  }

  const q = new URLSearchParams({ sensorName: name, startDate: start, endDate: end });
  const token = auth.get();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api/export/excel?${q}`, { headers });
  if (res.status === 401 || res.status === 403) {
    auth.clear();
    throw new Error("UNAUTHORIZED");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Unduhan Excel gagal. Coba lagi.");
  }
  blob = await res.blob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}_${start}_${end}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
