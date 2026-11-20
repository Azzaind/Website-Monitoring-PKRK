"use client";
import { useEffect, useMemo, useState } from "react";
import { getHistory, type Reading } from "@/lib/api";
import { PARAMS, findParam, rangeOf, statusOf, type Species } from "@/lib/params";
import { SensorIcon } from "./SensorIcons";

interface RealtimeChartProps {
  activeSensor: string;
  onSensorChange: (name: string) => void;
  species: Species;
  latestValue?: { value: number; at: string };
  isOnline: boolean;
}

type RangeMode = "live" | "today" | "7d" | "custom";

interface ChartPoint {
  time: string;
  timestamp: number;
  value: number;
}

const wibDate = (offsetDays = 0) =>
  new Date(Date.now() - offsetDays * 864e5).toLocaleDateString("sv-SE", {
    timeZone: "Asia/Jakarta",
  });

export function RealtimeChart({
  activeSensor,
  onSensorChange,
  species,
  latestValue,
  isOnline,
}: RealtimeChartProps) {
  const [rangeMode, setRangeMode] = useState<RangeMode>("live");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [livePoints, setLivePoints] = useState<ChartPoint[]>([]);
  const [historyPoints, setHistoryPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const def = findParam(activeSensor);
  const unit = def?.unit ?? "";
  const optimalRange = def ? rangeOf(def, species) : [0, 100];

  // Inisialisasi tanggal dan titik live awal di client side
  useEffect(() => {
    setStartDate(wibDate());
    setEndDate(wibDate());

    const now = Date.now();
    const init = Array.from({ length: 6 }).map((_, i) => ({
      time: new Date(now - (5 - i) * 10000).toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      timestamp: now - (5 - i) * 10000,
      value: latestValue?.value ?? 0,
    }));
    setLivePoints(init);
  }, []);

  // 1. Tambahkan titik baru ke livePoints setiap kali latestValue diperbarui via WebSocket/REST
  useEffect(() => {
    if (!latestValue || latestValue.value === undefined || isNaN(latestValue.value)) return;

    const ts = latestValue.at ? new Date(latestValue.at).getTime() : Date.now();
    const timeStr = new Date(ts).toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    setLivePoints((prev) => {
      // Hindari duplikasi timestamp sama persis
      if (prev.length > 0 && prev[prev.length - 1].timestamp === ts) return prev;
      const next = [...prev, { time: timeStr, timestamp: ts, value: latestValue.value }];
      // Pertahankan hingga 40 titik live terakhir
      return next.slice(-40);
    });
  }, [latestValue]);

  // 2. Muat data riwayat saat mode bukan live
  useEffect(() => {
    if (rangeMode === "live") return;

    let start = wibDate();
    let end = wibDate();

    if (rangeMode === "7d") {
      start = wibDate(6);
      end = wibDate();
    } else if (rangeMode === "custom") {
      start = startDate;
      end = endDate;
    }

    setLoading(true);
    getHistory(activeSensor, start, end)
      .then((res) => {
        const pts: ChartPoint[] = (res.data || []).map((r: Reading) => ({
          time: new Date(r.recordedAt).toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
          timestamp: new Date(r.recordedAt).getTime(),
          value: r.value,
        }));
        setHistoryPoints(pts);
      })
      .catch(() => {
        setHistoryPoints([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeSensor, rangeMode, startDate, endDate]);

  // Titik yang sedang ditampilkan
  const activePoints = useMemo(() => {
    if (rangeMode === "live") {
      return livePoints;
    }
    return historyPoints;
  }, [rangeMode, livePoints, historyPoints]);

  // Statistik (Min, Max, Avg, Latest)
  const stats = useMemo(() => {
    if (!activePoints.length) return { min: 0, max: 0, avg: 0, cur: 0 };
    const vals = activePoints.map((p) => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const cur = vals[vals.length - 1];
    return { min, max, avg, cur };
  }, [activePoints]);

  // Kalkulasi Geometri SVG Chart
  const svgW = 860;
  const svgH = 260;
  const padL = 45;
  const padR = 25;
  const padT = 25;
  const padB = 40;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  const yMin = Math.min(stats.min * 0.9, optimalRange[0] * 0.9, def?.minVal ?? 0);
  const yMax = Math.max(stats.max * 1.1, optimalRange[1] * 1.1, (def?.maxVal ?? 10) * 0.8, yMin + 1);
  const ySpan = yMax - yMin || 1;

  const getX = (idx: number) => {
    if (activePoints.length <= 1) return padL + chartW / 2;
    return padL + (idx / (activePoints.length - 1)) * chartW;
  };

  const getY = (val: number) => {
    const norm = (val - yMin) / ySpan;
    return padT + chartH - norm * chartH;
  };

  // Garis batas optimal
  const optYLo = getY(optimalRange[0]);
  const optYHi = getY(optimalRange[1]);

  // Path SVG Polylines
  const pointsString = activePoints
    .map((p, i) => `${getX(i).toFixed(1)},${getY(p.value).toFixed(1)}`)
    .join(" ");

  const areaPath = activePoints.length
    ? `M ${padL},${padT + chartH} L ${pointsString} L ${getX(activePoints.length - 1)},${padT + chartH} Z`
    : "";

  return (
    <section className="panel chart-panel" aria-label="Grafik Monitoring Real-Time">
      <div className="chart-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="icon-wrap" style={{ color: "var(--yellow)" }}>
              <SensorIcon name={activeSensor} />
            </div>
            <h2 style={{ margin: 0, fontSize: "1.3rem" }}>
              Grafik Real-Time & Riwayat: {def?.label ?? activeSensor}
            </h2>
          </div>
          <p className="meta" style={{ marginTop: 4 }}>
            Memantau aliran data sensor secara langsung dengan ambang batas optimal untuk {species}.
          </p>
        </div>

        {/* Status Live Indicator */}
        <div className="live-indicator">
          <span className={`pulse-dot ${rangeMode === "live" && isOnline ? "active" : ""}`} />
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
            {rangeMode === "live"
              ? isOnline
                ? "Live Streaming Aktif"
                : "Standby (Menunggu Koneksi)"
              : `Mode Riwayat (${activePoints.length} data)`}
          </span>
        </div>
      </div>

      {/* Tabs Pilihan Sensor */}
      <div className="sensor-tabs" role="tablist">
        {PARAMS.map((p) => {
          const isSelected = p.label.toLowerCase() === activeSensor.toLowerCase();
          return (
            <button
              key={p.label}
              role="tab"
              aria-selected={isSelected}
              className={`sensor-tab ${isSelected ? "active" : ""}`}
              onClick={() => onSensorChange(p.label)}
            >
              <SensorIcon name={p.label} className="tab-icon" />
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Waktu & Tanggal */}
      <div className="range-controls">
        <div className="seg">
          <button
            type="button"
            aria-pressed={rangeMode === "live"}
            onClick={() => setRangeMode("live")}
          >
            ● Real-Time Live
          </button>
          <button
            type="button"
            aria-pressed={rangeMode === "today"}
            onClick={() => setRangeMode("today")}
          >
            Hari Ini
          </button>
          <button
            type="button"
            aria-pressed={rangeMode === "7d"}
            onClick={() => setRangeMode("7d")}
          >
            7 Hari Terakhir
          </button>
          <button
            type="button"
            aria-pressed={rangeMode === "custom"}
            onClick={() => setRangeMode("custom")}
          >
            Filter Tanggal
          </button>
        </div>

        {rangeMode === "custom" && (
          <div className="date-filter-inline">
            <label style={{ fontSize: "0.85rem" }}>
              Dari:
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label style={{ fontSize: "0.85rem" }}>
              Sampai:
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>
        )}
      </div>

      {/* Statistik Cepat */}
      <div className="stats-row">
        <div className="stat-pill">
          <span className="stat-label">Terkini</span>
          <span className="stat-value" style={{ color: "var(--yellow)" }}>
            {stats.cur.toFixed(def?.digits ?? 2)} {unit}
          </span>
        </div>
        <div className="stat-pill">
          <span className="stat-label">Rata-rata</span>
          <span className="stat-value">{stats.avg.toFixed(def?.digits ?? 2)} {unit}</span>
        </div>
        <div className="stat-pill">
          <span className="stat-label">Terendah</span>
          <span className="stat-value">{stats.min.toFixed(def?.digits ?? 2)} {unit}</span>
        </div>
        <div className="stat-pill">
          <span className="stat-label">Tertinggi</span>
          <span className="stat-value">{stats.max.toFixed(def?.digits ?? 2)} {unit}</span>
        </div>
        <div className="stat-pill">
          <span className="stat-label">Optimal ({species})</span>
          <span className="stat-value" style={{ color: "var(--ok)" }}>
            {optimalRange[0]} – {optimalRange[1]} {unit}
          </span>
        </div>
      </div>

      {/* Visual Canvas SVG Chart */}
      <div className="chart-canvas-wrap">
        {loading && (
          <div className="chart-loading-overlay">
            <span>Memuat data riwayat dari Backend…</span>
          </div>
        )}

        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="chart-svg"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--yellow)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--yellow)" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="optimalZoneGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ok)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--ok)" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid Horizontal */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
            const y = padT + chartH * p;
            const val = yMax - p * ySpan;
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="var(--line)" strokeDasharray="3 3" />
                <text
                  x={padL - 8}
                  y={y + 4}
                  fill="var(--axis-text, #ffffff)"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="end"
                >
                  {val.toFixed(def?.digits === 0 ? 0 : 1)}
                </text>
              </g>
            );
          })}

          {/* Zona Optimal Band */}
          {optYHi < optYLo && (
            <g>
              <rect
                x={padL}
                y={optYHi}
                width={chartW}
                height={Math.max(0, optYLo - optYHi)}
                fill="url(#optimalZoneGrad)"
              />
              <line x1={padL} y1={optYHi} x2={padL + chartW} y2={optYHi} stroke="var(--ok)" strokeDasharray="4 4" strokeWidth="1" />
              <line x1={padL} y1={optYLo} x2={padL + chartW} y2={optYLo} stroke="var(--ok)" strokeDasharray="4 4" strokeWidth="1" />
            </g>
          )}

          {/* Area Fill & Garis Nilai */}
          {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}
          {pointsString && (
            <polyline
              points={pointsString}
              fill="none"
              stroke="var(--yellow)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Titik-titik Lingkaran */}
          {activePoints.map((p, i) => {
            const cx = getX(i);
            const cy = getY(p.value);
            const isHovered = hoverIndex === i;
            const isLast = i === activePoints.length - 1;

            return (
              <g key={i} onMouseEnter={() => setHoverIndex(i)} style={{ cursor: "pointer" }}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6 : isLast ? 4.5 : 3}
                  fill={isHovered ? "#fff" : "var(--yellow)"}
                  stroke="#000"
                  strokeWidth="1.5"
                />
                {isLast && rangeMode === "live" && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="8"
                    fill="none"
                    stroke="var(--yellow)"
                    strokeWidth="1.5"
                    className="live-pulse-ring"
                  />
                )}
              </g>
            );
          })}

          {/* Label X-Axis (Timestamp) */}
          {activePoints.length > 0 && (
            <>
              <text
                x={padL}
                y={svgH - 12}
                fill="var(--axis-text, #ffffff)"
                fontSize="11"
                fontWeight="600"
                textAnchor="start"
              >
                {activePoints[0].time}
              </text>
              {activePoints.length > 2 && (
                <text
                  x={padL + chartW / 2}
                  y={svgH - 12}
                  fill="var(--axis-text, #ffffff)"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {activePoints[Math.floor(activePoints.length / 2)].time}
                </text>
              )}
              <text
                x={padL + chartW}
                y={svgH - 12}
                fill="var(--axis-text, #ffffff)"
                fontSize="11"
                fontWeight="600"
                textAnchor="end"
              >
                {activePoints[activePoints.length - 1].time}
              </text>
            </>
          )}

          {/* Tooltip Saat Hover */}
          {hoverIndex !== null && activePoints[hoverIndex] && (
            <g transform={`translate(${getX(hoverIndex)}, ${getY(activePoints[hoverIndex].value)})`}>
              <line y1={-getY(activePoints[hoverIndex].value) + padT} y2={chartH + padT - getY(activePoints[hoverIndex].value)} stroke="var(--yellow)" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
              <rect
                x="-55"
                y="-42"
                width="110"
                height="34"
                rx="6"
                fill="var(--panel)"
                stroke="var(--yellow)"
                strokeWidth="1"
              />
              <text x="0" y="-24" fill="#fff" fontSize="11" fontWeight="700" textAnchor="middle">
                {activePoints[hoverIndex].value.toFixed(def?.digits ?? 2)} {unit}
              </text>
              <text x="0" y="-12" fill="var(--axis-text, #ffffff)" fontSize="10" textAnchor="middle">
                {activePoints[hoverIndex].time}
              </text>
            </g>
          )}
        </svg>
      </div>
    </section>
  );
}
