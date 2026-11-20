"use client";
import { SensorIcon } from "./SensorIcons";
import { fmt, fmtWib, type ParamDef, type Species, type Status } from "@/lib/params";

interface GaugeCardProps {
  name: string;
  value: number;
  unit: string;
  at: string;
  def?: ParamDef;
  status: Status;
  species: Species;
  isOnline: boolean;
  isStandby?: boolean;
}

const STATUS_TEXT: Record<Status, string> = {
  ok: "Optimal",
  low: "Rendah",
  high: "Tinggi",
  offline: "Belum Terkoneksi",
};

export function GaugeCard({
  name,
  value,
  unit,
  at,
  def,
  status,
  species,
  isOnline,
  isStandby = false,
}: GaugeCardProps) {
  const label = def?.label ?? name;
  const range = def?.ranges[species] ?? [0, 100];
  const [minOptimal, maxOptimal] = range;
  const minVal = def?.minVal ?? 0;
  const maxVal = def?.maxVal ?? 100;

  // Normalisasi nilai ke 0..100% untuk gauge
  const clampedVal = Math.min(maxVal, Math.max(minVal, value));
  const percent = maxVal > minVal ? ((clampedVal - minVal) / (maxVal - minVal)) * 100 : 0;
  const optMinPct = Math.max(0, ((minOptimal - minVal) / (maxVal - minVal)) * 100);
  const optMaxPct = Math.min(100, ((maxOptimal - minVal) / (maxVal - minVal)) * 100);

  // Status visual
  const effectiveStatus: Status = (!isOnline || isStandby || value === 0) ? "offline" : status;
  const statusLabel = STATUS_TEXT[effectiveStatus];

  // Radial Gauge Geometry (240-degree arc: from 150 deg to 390 deg)
  const radius = 54;
  const strokeWidth = 9;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * (240 / 360);
  const strokeDashoffset = arcLength - (arcLength * percent) / 100;

  // Warna status
  const glowColor =
    effectiveStatus === "ok"
      ? "var(--ok)"
      : effectiveStatus === "offline"
      ? "var(--muted)"
      : "var(--bad)";

  const isRadial = def?.gaugeType === "radial";

  return (
    <article className={`card gauge-card ${effectiveStatus}`}>
      <div className="top">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="icon-wrap" style={{ color: glowColor }}>
            <SensorIcon name={name} />
          </div>
          <h3 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 600 }}>{label}</h3>
        </div>
      </div>

      {isRadial ? (
        /* Circular / Radial Gauge Visual */
        <div className="radial-wrap" aria-hidden="true">
          <svg viewBox="0 0 140 115" className="gauge-svg">
            {/* Background Arc */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="var(--panel-2)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset="0"
              transform="rotate(150 70 70)"
              strokeLinecap="round"
            />
            {/* Optimal Range Highlight Arc */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="rgba(139, 224, 107, 0.25)"
              strokeWidth={strokeWidth + 2}
              strokeDasharray={`${(arcLength * (optMaxPct - optMinPct)) / 100} ${circumference}`}
              strokeDashoffset={-((arcLength * optMinPct) / 100)}
              transform="rotate(150 70 70)"
              strokeLinecap="butt"
            />
            {/* Active Progress Arc */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={glowColor}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(150 70 70)"
              strokeLinecap="round"
              className="gauge-val-arc"
            />
          </svg>

          {/* Nilai Besar di Tengah */}
          <div className="val-center">
            <span className="big-num">{isStandby && value === 0 ? "0" : fmt(value, def)}</span>
            <span className="unit-label">{unit}</span>
          </div>
        </div>
      ) : (
        /* Linear / Level Bar Gauge Visual (Water Level, Salinitas) */
        <div className="linear-wrap">
          <div className="val" style={{ margin: "4px 0 10px" }}>
            {isStandby && value === 0 ? "0" : fmt(value, def)}
            <small>{unit}</small>
          </div>
          <div className="linear-meter" aria-hidden="true">
            <div
              className="meter-optimal"
              style={{
                left: `${optMinPct}%`,
                width: `${optMaxPct - optMinPct}%`,
              }}
            />
            <div
              className="meter-fill"
              style={{
                width: `${percent}%`,
                background: glowColor,
              }}
            />
            <div
              className="meter-pin"
              style={{
                left: `${percent}%`,
                background: "#fff",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 4 }}>
            <span>{minVal} {unit}</span>
            <span>{maxVal} {unit}</span>
          </div>
        </div>
      )}

      {/* Footer Info & Target */}
      <div className="card-footer" style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid var(--line)" }}>
        {/* Keterangan Tanda Hijau untuk Batas Optimal */}
        <div className="optimal-info-row" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.8rem" }}>
          <span
            className="optimal-dot-marker"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "var(--ok)",
              display: "inline-block",
              flexShrink: 0,
              boxShadow: "0 0 6px rgba(16, 185, 129, 0.4)",
            }}
            aria-hidden="true"
          />
          <span style={{ color: "var(--text-muted)" }}>
            Batas Optimal:{" "}
            <strong style={{ color: "var(--text)" }}>
              {minOptimal} – {maxOptimal} {unit}
            </strong>
          </span>
        </div>

        {/* Status Sensor diletakkan di bawah kondisi optimal */}
        <div className="status-info-row" style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}>
          <span className={`tag ${effectiveStatus}`}>
            <i className="dot-mini" />
            {statusLabel}
          </span>
          {isOnline && at && !isStandby && (
            <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
              {fmtWib(at)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
