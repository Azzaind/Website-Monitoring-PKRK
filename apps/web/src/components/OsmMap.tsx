"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

interface OsmMapProps {
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  radiusMeters?: number | null;
  geofenceStatus?: string;
  distanceFromInstallation?: number | null;
  deviceName?: string;
  recordedAt?: string;
  isOnline?: boolean;
}

const DEFAULT_LAT = -7.2575;
const DEFAULT_LON = 112.7521;
const DEFAULT_RADIUS = 100;

export default function OsmMap({
  latitude,
  longitude,
  accuracyMeters,
  radiusMeters = DEFAULT_RADIUS,
  geofenceStatus = "NO_GPS_DATA",
  distanceFromInstallation,
  deviceName = "Perangkat Sensor Tambak",
  recordedAt,
  isOnline = false,
}: OsmMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);

  // Koordinat efektif (gunakan default tambak jika data BE belum tiba)
  const hasRealGps = latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined;
  const currentLat = hasRealGps ? latitude : DEFAULT_LAT;
  const currentLon = hasRealGps ? longitude : DEFAULT_LON;
  const currentRadius = radiusMeters ?? DEFAULT_RADIUS;

  // Inisialisasi peta Leaflet dengan OpenStreetMap
  useEffect(() => {
    let mapInstance: any = null;

    import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) return;

      // Inisialisasi Map
      mapInstance = L.map(containerRef.current, {
        center: [currentLat, currentLon],
        zoom: 17,
        scrollWheelZoom: true,
      });

      // Layer OpenStreetMap Resmi
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      }).addTo(mapInstance);

      // Custom Pin Marker menggunakan divIcon SVG
      const markerHtml = `
        <div class="osm-sensor-pin ${geofenceStatus.toLowerCase()}">
          <div class="pin-beacon"></div>
          <div class="pin-core">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5">
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" fill="var(--yellow)"/>
              <circle cx="12" cy="10" r="3" fill="#000"/>
            </svg>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-osm-icon",
        html: markerHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
      });

      const marker = L.marker([currentLat, currentLon], { icon: customIcon }).addTo(mapInstance);

      // Lingkaran Geofence Radius Aman
      const circleColor = geofenceStatus === "ALERT" ? "#FF5A4D" : "#FFC400";
      const circle = L.circle([DEFAULT_LAT, DEFAULT_LON], {
        radius: currentRadius,
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: 0.15,
        weight: 2,
        dashArray: "6, 6",
      }).addTo(mapInstance);

      mapRef.current = mapInstance;
      markerRef.current = marker;
      circleRef.current = circle;
      setLoaded(true);

      // Popup informasi titik sensor
      updatePopup(marker, L);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update posisi marker & geofence saat koordinat dari BE berubah
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !loaded) return;

    import("leaflet").then((L) => {
      markerRef.current.setLatLng([currentLat, currentLon]);
      if (circleRef.current) {
        circleRef.current.setRadius(currentRadius);
        const circleColor = geofenceStatus === "ALERT" ? "#FF5A4D" : "#FFC400";
        circleRef.current.setStyle({ color: circleColor, fillColor: circleColor });
      }
      updatePopup(markerRef.current, L);
      mapRef.current.panTo([currentLat, currentLon]);
    });
  }, [currentLat, currentLon, currentRadius, geofenceStatus, loaded]);

  const updatePopup = (marker: any, L: any) => {
    const timeFormatted = recordedAt
      ? new Date(recordedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
      : "Belum ada rekaman";

    const statusBadge =
      geofenceStatus === "SAFE"
        ? '<span style="color:#8BE06B;font-weight:700;">Aman (Dalam Batas)</span>'
        : geofenceStatus === "ALERT"
        ? '<span style="color:#FF5A4D;font-weight:700;">Peringatan: Di Luar Geofence!</span>'
        : '<span style="color:#FF9F0A;font-weight:700;">Standby / Menunggu GPS</span>';

    const popupContent = `
      <div style="font-family:system-ui,sans-serif;font-size:0.85rem;line-height:1.4;color:#111;min-width:200px;">
        <h4 style="margin:0 0 6px;font-size:0.95rem;color:#000;">${deviceName}</h4>
        <div><b>Status:</b> ${statusBadge}</div>
        <div><b>Koordinat:</b> ${currentLat.toFixed(5)}, ${currentLon.toFixed(5)}</div>
        ${distanceFromInstallation !== null && distanceFromInstallation !== undefined ? `<div><b>Jarak Pusat:</b> ${distanceFromInstallation} meter</div>` : ""}
        ${accuracyMeters ? `<div><b>Akurasi GPS:</b> ±${Math.round(accuracyMeters)} m</div>` : ""}
        <div style="font-size:0.75rem;color:#666;margin-top:4px;">Pembaruan: ${timeFormatted}</div>
      </div>
    `;

    marker.bindPopup(popupContent);
  };

  const centerToSensor = () => {
    if (mapRef.current) {
      mapRef.current.flyTo([currentLat, currentLon], 18, { duration: 1 });
      if (markerRef.current) markerRef.current.openPopup();
    }
  };

  const osmWebUrl = `https://www.openstreetmap.org/?mlat=${currentLat}&mlon=${currentLon}#map=18/${currentLat}/${currentLon}`;

  return (
    <section className="panel osm-panel" aria-label="Peta Lokasi OpenStreetMap">
      <div className="osm-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2">
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Lokasi Sensor Tambak (OpenStreetMap)</h2>
          </div>
          <p className="meta" style={{ marginTop: 4 }}>
            Pemetaan titik sensor aktual berbasis OpenStreetMap dengan visualisasi batas aman geofence.
          </p>
        </div>

        <div className="osm-actions">
          <button type="button" className="btn ghost sm" onClick={centerToSensor}>
            Pusatkan ke Sensor
          </button>
          <a
            href={osmWebUrl}
            target="_blank"
            rel="noreferrer"
            className="btn ghost sm"
            style={{ textDecoration: "none" }}
          >
            Buka di OpenStreetMap.org ↗
          </a>
        </div>
      </div>

      {/* Status Lokasi Bar */}
      <div className="osm-info-bar">
        <div className="info-item">
          <span className="lbl">Titik Koordinat:</span>
          <span className="val">{currentLat.toFixed(5)}, {currentLon.toFixed(5)}</span>
        </div>
        <div className="info-item">
          <span className="lbl">Status Geofence:</span>
          <span className={`val badge ${geofenceStatus.toLowerCase()}`}>
            {geofenceStatus === "SAFE" ? "Aman" : geofenceStatus === "ALERT" ? "Di Luar Batas!" : "Standby"}
          </span>
        </div>
        {distanceFromInstallation !== null && distanceFromInstallation !== undefined && (
          <div className="info-item">
            <span className="lbl">Jarak dari Titik Pusat:</span>
            <span className="val">{distanceFromInstallation} m (Radius: {currentRadius} m)</span>
          </div>
        )}
        <div className="info-item">
          <span className="lbl">Sinyal GPS:</span>
          <span className="val">
            {hasRealGps ? (accuracyMeters ? `±${Math.round(accuracyMeters)} m` : "Terkoneksi") : "Koordinat Standby (Tambak)"}
          </span>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className="osm-container-wrap">
        <div ref={containerRef} className="osm-map-canvas" />
      </div>
    </section>
  );
}
