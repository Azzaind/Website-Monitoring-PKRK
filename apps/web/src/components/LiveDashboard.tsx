"use client";
import { useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { useLive } from "@/hooks/useLive";
import { GaugeCard } from "./GaugeCard";
import { RealtimeChart } from "./RealtimeChart";
import { Reveal, useSectionFocus, useButtonFx } from "./Reveal";
import {
  PARAMS,
  SPECIES,
  findParam,
  statusOf,
  fmtWib,
  type Species,
} from "@/lib/params";

// Dynamic import Leaflet OpenStreetMap agar tidak dieksekusi di Server Side (SSR)
const OsmMap = dynamic(() => import("./OsmMap"), { ssr: false });

const LEVEL = { good: "Optimal", mid: "Waspada", bad: "Perlu Tindakan" };

export default function LiveDashboard({
  title,
  right,
  dummy = false,
  children,
}: {
  title: string;
  right?: ReactNode;
  dummy?: boolean;
  children?: ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") || title.toLowerCase().includes("admin");

  const { data, gps, online, refresh, lastStreamEvent } = useLive(dummy);
  const [sp, setSp] = useState<Species>("bandeng");
  const [activeChartSensor, setActiveChartSensor] = useState<string>("Suhu");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useSectionFocus();
  useButtonFx();

  // Daftar sensor terurut
  const items = useMemo(() => {
    return Object.values(data)
      .map((d) => {
        const def = findParam(d.name);
        return {
          ...d,
          def,
          st: def ? statusOf(d.value, def, sp, online) : ("offline" as const),
        };
      })
      .sort((a, b) => (a.def ? PARAMS.indexOf(a.def) : 99) - (b.def ? PARAMS.indexOf(b.def) : 99));
  }, [data, sp, online]);

  // Titik GPS Utama (perangkat pertama atau standby)
  const primaryGps = useMemo(() => {
    const list = Object.values(gps);
    return list[0] ?? null;
  }, [gps]);

  // Parameter yang aktif untuk grafik
  const activeChartItem = useMemo(() => {
    return items.find((i) => i.name.toLowerCase() === activeChartSensor.toLowerCase()) ?? items[0];
  }, [items, activeChartSensor]);

  // Evaluasi kondisi tambak
  const realItems = items.filter((i) => !i.isStandby && i.value > 0);
  const bad = realItems.filter((i) => i.st === "low" || i.st === "high");
  const level = !realItems.length
    ? null
    : bad.length === 0
    ? "good"
    : bad.length === 1
    ? "mid"
    : "bad";
  const last = items.reduce((m, i) => (i.at && i.at > m ? i.at : m), "");

  // Persentase parameter optimal untuk donut chart widget
  const optimalCount = realItems.length ? realItems.length - bad.length : 0;
  const optimalPercent = realItems.length ? Math.round((optimalCount / realItems.length) * 100) : 0;

  return (
    <div className="dashboard-layout-root" id="overview">
      {/* Sidebar Navigasi Kiri */}
      <Sidebar
        isAdmin={isAdmin}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Area Konten Utama */}
      <div className="dashboard-main-area">
        {/* Top Header Bar */}
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka menu samping"
            >
              ☰
            </button>
            <div className="topbar-welcome">
              <span className="welcome-tag">ABMAS PKRK ITS • SISTEM MONITORING</span>
              <h1 className="topbar-title">{title}</h1>
            </div>
          </div>

          <div className="topbar-right">
            {/* Status Koneksi Pill */}
            <div className={`status-pill ${online ? "on" : "off"}`}>
              <span className="dot" />
              <span>{online ? "Terhubung (Live)" : "Terputus (Standby)"}</span>
            </div>

            {/* Selector Budidaya */}
            <div className="species-seg" role="group" aria-label="Pilih jenis budidaya">
              {(Object.keys(SPECIES) as Species[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={sp === k}
                  className={`species-btn ${sp === k ? "active" : ""}`}
                  onClick={() => setSp(k)}
                >
                  {SPECIES[k]}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn ghost sm refresh-btn"
              onClick={() => refresh()}
              title="Perbarui data dari server Backend"
            >
              Segarkan
            </button>

            {/* Theme Toggle Button */}
            <ThemeToggle compact />

            {/* Extra right action (e.g. Logout on Admin) */}
            {right}
          </div>
        </header>

        {/* Konten Halaman */}
        <main className="dashboard-content">
          {/* Banner Status Koneksi Backend */}
          {!online && !dummy && (
            <div className="status-banner offline" role="status">
              <span className="dot-pulse" />
              <div>
                <b>Status: Sensor Belum Terkoneksi</b>
              </div>
            </div>
          )}

          {online && (
            <div className="status-banner online" role="status">
              <span className="dot-pulse green" />
              <div>
                <b>Status: Terhubung ke Backend PKRK ABMAS</b> — Aliran data sensor dan GPS real-time aktif via WebSocket.
              </div>
            </div>
          )}

          {dummy && (
            <div className="status-banner" style={{ background: "var(--yellow-soft)", borderColor: "var(--yellow)" }}>
              Data simulasi contoh aktif. Halaman ini sedang menjalankan mode simulasi lokal.
            </div>
          )}

          {/* 1. Baris KPI Metric Cards (6 Parameter Sensor Tambak) */}
          <section id="sensors" className="content-section" aria-label="Parameter Sensor Kualitas Air">
            <Reveal>
              <div className="section-head">
                <div>
                  <h2 className="section-heading">Parameter Kualitas Air Tambak</h2>
                  <p className="section-desc">
                    Tampilan indikator real-time dengan ambang batas ideal budidaya {SPECIES[sp]}.
                  </p>
                </div>
              </div>
            </Reveal>

            <div className="kpi-grid">
              {items.map((i, idx) => (
                <Reveal key={i.name} delay={(idx % 3) * 80}>
                  <GaugeCard
                    name={i.name}
                    value={i.value}
                    unit={i.unit}
                    at={i.at}
                    def={i.def}
                    status={i.st}
                    species={sp}
                    isOnline={online}
                    isStandby={i.isStandby}
                  />
                </Reveal>
              ))}
            </div>
          </section>

          {/* 2. Baris Tengah: Grafik Real-Time (Lebar) & Ringkasan Kondisi Air (Kanan) */}
          <section className="chart-analytics-grid">
            {/* Kolom Grafik Utama */}
            <Reveal id="chart" className="chart-col">
              <RealtimeChart
                activeSensor={activeChartSensor}
                onSensorChange={setActiveChartSensor}
                species={sp}
                latestValue={
                  lastStreamEvent &&
                  findParam(lastStreamEvent.sensorName)?.label === activeChartItem?.name
                    ? { value: lastStreamEvent.value, at: lastStreamEvent.at }
                    : activeChartItem
                    ? { value: activeChartItem.value, at: activeChartItem.at }
                    : undefined
                }
                isOnline={online}
              />
            </Reveal>

            {/* Kolom Ringkasan Kondisi & Indeks Kesehatan Air Tambak */}
            <Reveal className="overview-col" delay={120}>
              <article className="card health-card">
                <div className="card-top-header">
                  <div>
                    <span className="sub-tag">STATUS KUALITAS AIR</span>
                    <h3 className="card-title">Kondisi Tambak</h3>
                  </div>
                  <span className={`status-pill ${realItems.length > 0 && level ? (level === "good" ? "on" : "off") : ""}`}>
                    {realItems.length > 0 && level ? LEVEL[level] : "Standby"}
                  </span>
                </div>

                {/* Donut Score Visual */}
                <div className="health-donut-wrap">
                  <svg viewBox="0 0 120 120" className="donut-svg">
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      stroke="var(--panel-2)"
                      strokeWidth="10"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      stroke={level === "good" ? "var(--ok)" : level === "mid" ? "var(--yellow)" : "var(--bad)"}
                      strokeWidth="10"
                      strokeDasharray={`${2 * Math.PI * 48}`}
                      strokeDashoffset={`${2 * Math.PI * 48 * (1 - (realItems.length ? optimalPercent / 100 : 0))}`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                      style={{ transition: "stroke-dashoffset 0.8s ease" }}
                    />
                  </svg>
                  <div className="donut-text">
                    <span className="donut-percent">{realItems.length ? `${optimalPercent}%` : "0%"}</span>
                    <span className="donut-label">{realItems.length ? "Optimal" : "Standby"}</span>
                  </div>
                </div>

                {/* Health Metrics List */}
                <div className="health-details">
                  <div className="health-stat-item">
                    <span className="label">Budidaya Aktif:</span>
                    <span className="health-stat-val" style={{ color: "var(--yellow)", fontWeight: 700 }}>{SPECIES[sp]}</span>
                  </div>
                  <div className="health-stat-item">
                    <span className="label">Parameter Sesuai:</span>
                    <span className="health-stat-val">
                      {realItems.length > 0 ? `${optimalCount} dari ${items.length} sensor` : "0 dari 6 sensor"}
                    </span>
                  </div>
                  <div className="health-stat-item">
                    <span className="label">Perlu Diperhatikan:</span>
                    <span className="health-stat-val" style={{ color: bad.length > 0 ? "var(--bad)" : "var(--text-muted)" }}>
                      {realItems.length > 0 ? `${bad.length} parameter` : "0 parameter"}
                    </span>
                  </div>
                </div>

                {/* Advice Box - Hanya tampil jika data riil masuk */}
                {realItems.length > 0 && (
                  bad.length > 0 ? (
                    <div className="advice-box warning">
                      <span className="advice-title">⚠️ Rekomendasi Tindakan:</span>
                      <ul className="advice-list">
                        {bad.map((i) => (
                          <li key={i.name}>
                            <b>{i.def?.label ?? i.name} ({i.st === "low" ? "Rendah" : "Tinggi"}):</b>{" "}
                            {i.st === "low" ? i.def?.low : i.def?.high}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="advice-box ok">
                      <span>✨ Semua parameter dalam kondisi optimal. Tidak diperlukan intervensi air saat ini.</span>
                    </div>
                  )
                )}

                <div className="health-footer">
                  <span>Pembaruan: {realItems.length > 0 ? fmtWib(last) : "Belum ada data"}</span>
                </div>
              </article>
            </Reveal>
          </section>

          {/* 3. Baris Peta OpenStreetMap (OSM) */}
          {primaryGps && (
            <section id="map" className="content-section" style={{ marginTop: "calc(var(--gap) * 1.5)" }}>
              <Reveal>
                <OsmMap
                  latitude={primaryGps.latitude}
                  longitude={primaryGps.longitude}
                  accuracyMeters={primaryGps.accuracyMeters}
                  radiusMeters={primaryGps.radiusMeters}
                  geofenceStatus={primaryGps.geofenceStatus}
                  distanceFromInstallation={primaryGps.distanceFromInstallation}
                  deviceName={primaryGps.deviceName}
                  recordedAt={primaryGps.recordedAt}
                  isOnline={online}
                />
              </Reveal>
            </section>
          )}

          {/* 4. Panel Admin (Geofence & Export) */}
          {children && <Reveal>{children}</Reveal>}
        </main>
      </div>
    </div>
  );
}