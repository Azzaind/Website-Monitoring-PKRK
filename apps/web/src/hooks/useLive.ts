"use client";
import { useEffect, useState } from "react";
import { getLatest, mockSensors, mockValue } from "@/lib/api";
import { MOCK, WS_URL } from "@/lib/config";

export interface LiveItem { name: string; unit: string; value: number; at: string }

export function useLive(dummy = false) {
  const [data, setData] = useState<Record<string, LiveItem>>({});
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let ws: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout>;
    let sim: ReturnType<typeof setInterval>;

    const apply = (name: string, unit: string, value: number, at: string) =>
      setData((p) => ({ ...p, [name]: { name, unit, value, at } }));

    // 0) mode dummy khusus halaman: tanpa BE dan tanpa sensor
    if (dummy) {
      const seed = () =>
        mockSensors.forEach((s, i) => apply(s.name, s.unit, mockValue(i), new Date().toISOString()));
      seed();
      setLoading(false);
      setOnline(true);
      const t = setInterval(seed, 3000);
      return () => { alive = false; clearInterval(t); };
    }

    // 1) data awal dari REST
    getLatest()
      .then((list) => {
        if (!alive) return;
        list.forEach((s) => s.readings[0] && apply(s.name, s.unit, s.readings[0].value, s.readings[0].recordedAt));
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));

    // 2) mode simulasi
    if (MOCK) {
      setOnline(true);
      sim = setInterval(
        () => mockSensors.forEach((s, i) => apply(s.name, s.unit, mockValue(i), new Date().toISOString())),
        3000
      );
      return () => { alive = false; clearInterval(sim); };
    }

    // 3) update real-time lewat WebSocket (event NEW_READING), reconnect otomatis
    const connect = () => {
      ws = new WebSocket(WS_URL);
      ws.onopen = () => setOnline(true);
      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data);
          if (m.type === "NEW_READING") apply(m.data.sensorName, m.data.unit, m.data.value, m.data.recordedAt);
        } catch {}
      };
      ws.onclose = () => { setOnline(false); if (alive) timer = setTimeout(connect, 3000); };
      ws.onerror = () => ws?.close();
    };
    connect();

    return () => { alive = false; clearTimeout(timer); ws?.close(); };
  }, [dummy]);

  return { data, online, loading };
}