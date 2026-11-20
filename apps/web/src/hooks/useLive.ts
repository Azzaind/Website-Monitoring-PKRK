"use client";
import { useCallback, useEffect, useState } from "react";
import {
  getDashboardOverview,
  getLatest,
  getLatestLocations,
  mockSensors,
  mockValue,
  type GeofenceStatus,
} from "@/lib/api";
import { DEFAULT_SENSORS, PARAMS, findParam } from "@/lib/params";
import { MOCK, WS_URL } from "@/lib/config";

export interface LiveItem {
  name: string;
  unit: string;
  value: number;
  at: string;
  isStandby?: boolean;
}

export interface LiveGps {
  deviceId: string;
  deviceName?: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  recordedAt: string;
  geofenceStatus?: GeofenceStatus;
  distanceFromInstallation?: number | null;
  radiusMeters?: number | null;
  isStandby?: boolean;
}

// Inisialisasi awal 6 sensor standar dengan nilai standby 0 agar UI tidak kosong
const initialDefaultSensors = (): Record<string, LiveItem> => {
  const map: Record<string, LiveItem> = {};
  DEFAULT_SENSORS.forEach((s) => {
    map[s.name] = {
      name: s.name,
      unit: s.unit,
      value: 0,
      at: "",
      isStandby: true,
    };
  });
  return map;
};

const initialDefaultGps = (): Record<string, LiveGps> => ({
  "standby-device": {
    deviceId: "default_device",
    deviceName: "Sensor Tambak PKRK ABMAS",
    latitude: -7.2575,
    longitude: 112.7521,
    accuracyMeters: null,
    recordedAt: "",
    geofenceStatus: "NOT_CONFIGURED",
    distanceFromInstallation: 0,
    radiusMeters: 100,
    isStandby: true,
  },
});

export function useLive(dummy = false) {
  const [data, setData] = useState<Record<string, LiveItem>>(initialDefaultSensors);
  const [gps, setGps] = useState<Record<string, LiveGps>>(initialDefaultGps);
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastStreamEvent, setLastStreamEvent] = useState<{ sensorName: string; value: number; at: string } | null>(null);

  // Perbarui data sensor dan hilangkan status standby
  const applySensor = useCallback((name: string, unit: string, value: number, at: string) => {
    setData((prev) => {
      // Cari apakah nama cocok dengan parameter standar (misal "ph" cocok dengan "pH")
      const def = findParam(name);
      const key = def ? def.label : name;

      return {
        ...prev,
        [key]: {
          name: key,
          unit: def?.unit ?? unit,
          value,
          at,
          isStandby: false,
        },
      };
    });

    setLastStreamEvent({ sensorName: name, value, at });
  }, []);

  const applyGps = useCallback((item: LiveGps) => {
    setGps((prev) => ({
      ...prev,
      [item.deviceId]: {
        ...prev[item.deviceId],
        ...item,
        isStandby: false,
      },
    }));
  }, []);

  // Sinkronisasi data dari REST API Backend
  const refresh = useCallback(async () => {
    try {
      const overview = await getDashboardOverview();
      if (overview && overview.length > 0) {
        overview.forEach((dev) => {
          dev.sensors.forEach((s) => {
            if (s.latestValue !== null && s.recordedAt) {
              applySensor(s.name, s.unit, s.latestValue, s.recordedAt);
            }
          });

          if (dev.gps) {
            applyGps({
              deviceId: dev.device.id,
              deviceName: dev.device.name,
              latitude: dev.gps.latitude,
              longitude: dev.gps.longitude,
              accuracyMeters: dev.gps.accuracyMeters,
              recordedAt: dev.gps.recordedAt,
              geofenceStatus: dev.geofence.status,
              distanceFromInstallation: dev.geofence.distanceFromInstallation,
              radiusMeters: dev.geofence.radiusMeters,
            });
          }
        });
      } else {
        // Coba endpoint sensor latest
        const list = await getLatest();
        list.forEach((s) => {
          if (s.readings[0]) {
            applySensor(s.name, s.unit, s.readings[0].value, s.readings[0].recordedAt);
          }
        });
      }
    } catch {
      // Jika Backend offline, sensor tetap ada dengan nilai 0 (standby)
    }
  }, [applySensor, applyGps]);

  useEffect(() => {
    let alive = true;
    let ws: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout>;
    let sim: ReturnType<typeof setInterval>;

    // 0) Mode Dummy Eksplisit
    if (dummy) {
      const seed = () => {
        mockSensors.forEach((s, i) =>
          applySensor(s.name, s.unit, mockValue(i), new Date().toISOString())
        );
        applyGps({
          deviceId: "mock-1",
          deviceName: "Tambak Contoh (Simulasi)",
          latitude: -7.2575,
          longitude: 112.7521,
          accuracyMeters: 8,
          recordedAt: new Date().toISOString(),
          geofenceStatus: "SAFE",
          distanceFromInstallation: 12.5,
          radiusMeters: 100,
        });
      };
      seed();
      setLoading(false);
      setOnline(true);
      const t = setInterval(seed, 3000);
      return () => {
        alive = false;
        clearInterval(t);
      };
    }

    // 1) Mode Simulasi Mock
    if (MOCK) {
      refresh().finally(() => alive && setLoading(false));
      setOnline(true);
      sim = setInterval(() => {
        mockSensors.forEach((s, i) =>
          applySensor(s.name, s.unit, mockValue(i), new Date().toISOString())
        );
      }, 3000);
      return () => {
        alive = false;
        clearInterval(sim);
      };
    }

    // 2) Ambil data awal dari REST Backend
    refresh().finally(() => {
      if (alive) setLoading(false);
    });

    // 3) Hubungkan WebSocket Real-time dengan Backend
    const connect = () => {
      try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          if (alive) setOnline(true);
        };

        ws.onmessage = (e) => {
          if (!alive) return;
          try {
            const m = JSON.parse(e.data);
            if (m.type === "NEW_READING" && m.data) {
              applySensor(
                m.data.sensorName,
                m.data.unit,
                m.data.value,
                m.data.recordedAt
              );
            } else if (m.type === "NEW_LOCATION" && m.data) {
              applyGps({
                deviceId: m.data.deviceId,
                latitude: m.data.latitude,
                longitude: m.data.longitude,
                accuracyMeters: m.data.accuracyMeters ?? null,
                recordedAt: m.data.recordedAt,
                geofenceStatus: m.data.geofenceStatus,
                distanceFromInstallation: m.data.distanceFromInstallation ?? null,
              });
            }
          } catch {}
        };

        ws.onclose = () => {
          if (alive) {
            setOnline(false);
            timer = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        if (alive) {
          setOnline(false);
          timer = setTimeout(connect, 3000);
        }
      }
    };

    connect();

    return () => {
      alive = false;
      clearTimeout(timer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [dummy, refresh, applySensor, applyGps]);

  return { data, gps, online, loading, refresh, lastStreamEvent };
}
