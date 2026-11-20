"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { easeScrollTo, sectionTop, topbarOffset } from "./Reveal";

interface SidebarProps {
  isAdmin?: boolean;
  adminName?: string;
  onLogout?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  rightAction?: ReactNode;
}

export function Sidebar({
  isAdmin = false,
  adminName,
  onLogout,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const [activeId, setActiveId] = useState<string>("overview");
  // Selama true, deteksi scroll diabaikan agar menu yang diklik tidak berpindah sendiri
  const lockRef = useRef(false);

  useEffect(() => {
    const ids = isAdmin
      ? ["sensors", "chart", "map", "geofence", "unduh"]
      : ["sensors", "chart", "map"];

    const handleScroll = () => {
      if (lockRef.current) return;
      const y = window.scrollY;
      if (y < 40) {
        setActiveId("overview");
        return;
      }

      // Garis acuan sedikit di bawah top bar, sama dengan posisi tujuan saat menu diklik
      const probe = y + topbarOffset() + 32;
      let current = "overview";
      for (const id of ids) {
        const top = sectionTop(id);
        if (top !== null && top <= probe) current = id;
      }

      // Di dasar halaman, bagian terakhir yang ada dianggap aktif
      if (window.innerHeight + y >= document.documentElement.scrollHeight - 4) {
        const last = [...ids].reverse().find((id) => document.getElementById(id));
        if (last) current = last;
      }
      setActiveId(current);
    };

    // Kunci dilepas ketika pengguna menggulir sendiri
    const unlock = () => {
      lockRef.current = false;
    };
    const userEvents = ["wheel", "touchmove", "keydown", "pointerdown"] as const;

    window.addEventListener("scroll", handleScroll, { passive: true });
    userEvents.forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      userEvents.forEach((ev) => window.removeEventListener(ev, unlock));
    };
  }, [isAdmin]);

  const scrollTo = (id: string) => {
    setActiveId(id);
    lockRef.current = true;
    if (onClose) onClose();
    easeScrollTo(id === "overview" ? 0 : id);
  };

  return (
    <>
      {/* Backdrop overlay saat sidebar terbuka di mobile */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`dashboard-sidebar ${isOpen ? "open" : ""}`} aria-label="Navigasi Utama">
        {/* Brand Header */}
        <div className="sidebar-brand">
          <Link href="/" className="brand-logo" onClick={onClose}>
            <span className="brand-mark">P</span>
            <div className="brand-text">
              <span className="brand-title">PKRK ABMAS</span>
              <span className="brand-sub">Monitoring Air Tambak</span>
            </div>
          </Link>

          {/* Tombol Close Mobile */}
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Tutup navigasi"
          >
            ✕
          </button>
        </div>

        {/* Menu Items */}
        <nav className="sidebar-nav">

          <button
            type="button"
            className={`nav-item ${activeId === "overview" ? "active" : ""}`}
            onClick={() => scrollTo("overview")}
          >
            <span>Ringkasan Tambak</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeId === "sensors" ? "active" : ""}`}
            onClick={() => scrollTo("sensors")}
          >
            <span>Parameter Sensor</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeId === "chart" ? "active" : ""}`}
            onClick={() => scrollTo("chart")}
          >
            <span>Grafik Real-Time</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeId === "map" ? "active" : ""}`}
            onClick={() => scrollTo("map")}
          >
            <span>Peta Lokasi (OSM)</span>
          </button>

          {isAdmin && (
            <>
              <div className="nav-group-title" style={{ marginTop: 16 }}>ADMINISTRASI</div>

              <button
                type="button"
                className={`nav-item ${activeId === "geofence" ? "active" : ""}`}
                onClick={() => scrollTo("geofence")}
              >
                <span className="nav-icon">⚙️</span>
                <span>Konfigurasi Geofence</span>
              </button>

              <button
                type="button"
                className={`nav-item ${activeId === "unduh" ? "active" : ""}`}
                onClick={() => scrollTo("unduh")}
              >
                <span className="nav-icon">📥</span>
                <span>Unduh Riwayat (CSV/Excel)</span>
              </button>
            </>
          )}

          <div className="nav-group-title" style={{ marginTop: 16 }}>AKSES HALAMAN</div>
          {pathname === "/admin" ? (
            <Link href="/monitoring" className="nav-item" onClick={onClose}>
              <span className="nav-icon">👁️</span>
              <span>Halaman Publik</span>
            </Link>
          ) : (
            <Link href="/admin" className="nav-item" onClick={onClose}>
              <span className="nav-icon">🔐</span>
              <span>Panel Admin</span>
            </Link>
          )}
        </nav>

        {/* Bottom User & Theme Card */}
        <div className="sidebar-footer">
          <div className="role-card">
            <div className="role-avatar">
              {isAdmin ? "🛡️" : "🌱"}
            </div>
            <div className="role-info">
              <span className="role-name">{isAdmin ? adminName || "Admin Tambak" : "Pengguna Publik"}</span>
              <span className="role-badge">{isAdmin ? "Mode Admin Aktif" : "Pemantauan Publik"}</span>
            </div>
          </div>

          <div className="sidebar-actions-row">
            <ThemeToggle className="sidebar-theme-toggle" />
            {isAdmin && onLogout && (
              <button
                type="button"
                className="btn ghost sm logout-btn"
                onClick={onLogout}
                title="Keluar dari sesi admin"
              >
                Keluar
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}