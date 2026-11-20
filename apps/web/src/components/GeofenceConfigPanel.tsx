"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  getLatestLocations,
  updateGeofence,
  errText,
  type GpsLocation,
} from "@/lib/api";

interface DeviceOption {
  deviceId: string;
  deviceName: string;
  location: GpsLocation | null;
}

export default function GeofenceConfigPanel({ onExpired }: { onExpired: () => void }) {
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [latitude, setLatitude] = useState<string>("-7.2575");
  const [longitude, setLongitude] = useState<string>("112.7521");
  const [radius, setRadius] = useState<string>("100");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    getLatestLocations()
      .then((list) => {
        setDevices(list);
        if (list[0]) {
          setSelectedId(list[0].deviceId);
          if (list[0].location) {
            setLatitude(String(list[0].location.latitude));
            setLongitude(String(list[0].location.longitude));
          }
        }
      })
      .catch((e) => {
        setMsg({ text: errText(e), isError: true });
      });
  }, []);

  const selectedDevice = devices.find((d) => d.deviceId === selectedId);

  const applyCurrentLocation = () => {
    if (selectedDevice?.location) {
      setLatitude(String(selectedDevice.location.latitude));
      setLongitude(String(selectedDevice.location.longitude));
      setMsg({
        text: `Koordinat diisi otomatis dari GPS terakhir perangkat (${selectedDevice.location.latitude.toFixed(5)}, ${selectedDevice.location.longitude.toFixed(5)})`,
        isError: false,
      });
    } else {
      setMsg({ text: "Belum ada rekaman GPS terbaru untuk perangkat ini.", isError: true });
    }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    const radNum = parseFloat(radius);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setBusy(false);
      return setMsg({ text: "Latitude harus bernilai angka antara -90 sampai 90.", isError: true });
    }
    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      setBusy(false);
      return setMsg({ text: "Longitude harus bernilai angka antara -180 sampai 180.", isError: true });
    }
    if (isNaN(radNum) || radNum <= 0 || radNum > 100000) {
      setBusy(false);
      return setMsg({ text: "Radius aman harus lebih besar dari 0 sampai 100.000 meter.", isError: true });
    }

    try {
      await updateGeofence({
        deviceId: selectedId,
        latitude: latNum,
        longitude: lonNum,
        radiusMeters: radNum,
      });
      setMsg({
        text: `Berhasil! Geofence untuk ${selectedDevice?.deviceName ?? selectedId} berhasil diperbarui (Radius: ${radNum} m).`,
        isError: false,
      });
    } catch (err) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        onExpired();
      } else {
        setMsg({ text: errText(err), isError: true });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" id="geofence" style={{ marginTop: "calc(var(--gap) * 1.5)" }}>
      <h2>Konfigurasi Geofence Tambak</h2>
      <p className="meta">
        Atur titik pusat instalasi tambak dan batas radius aman (meter). Backend akan mendeteksi status
        SAFE atau ALERT secara otomatis.
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
        <div className="form">
          <label>
            Pilih Perangkat
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                const dev = devices.find((d) => d.deviceId === e.target.value);
                if (dev?.location) {
                  setLatitude(String(dev.location.latitude));
                  setLongitude(String(dev.location.longitude));
                }
              }}
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.deviceName} ({d.deviceId.slice(0, 8)}…)
                </option>
              ))}
              {devices.length === 0 && <option value="">Tidak ada perangkat aktif</option>}
            </select>
          </label>

          <label>
            Latitude Pusat (-90 s/d 90)
            <input
              type="number"
              step="any"
              required
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="-7.2575"
            />
          </label>

          <label>
            Longitude Pusat (-180 s/d 180)
            <input
              type="number"
              step="any"
              required
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="112.7521"
            />
          </label>

          <label>
            Radius Aman (meter)
            <input
              type="number"
              step="1"
              min="1"
              max="100000"
              required
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              placeholder="100"
            />
          </label>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={applyCurrentLocation}
            disabled={!selectedDevice?.location}
          >
            Gunakan Koordinat GPS Terkini
          </button>
          <button type="submit" className="btn sm" disabled={busy || !selectedId}>
            {busy ? "Menyimpan…" : "Simpan Konfigurasi Geofence"}
          </button>
        </div>

        {msg && (
          <p className={`msg ${msg.isError ? "err" : ""}`} role="alert" style={{ marginTop: 12 }}>
            {msg.text}
          </p>
        )}
      </form>
    </section>
  );
}
