import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

export default function Header({ online, right }: { online?: boolean; right?: ReactNode }) {
  return (
    <>
      <header className="hdr" style={{ borderBottom: "1px solid var(--line)", background: "var(--sidebar-bg)" }}>
        <div className="wrap" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "14px 24px" }}>
          <Link href="/" className="brand" aria-label="Kembali ke halaman utama" style={{ display: "flex", alignItems: "center", gap: 12, marginRight: "auto" }}>
            <span className="brand-mark">P</span>
            <span style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--text)" }}>Monitoring Air Tambak</span>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>ABMAS PKRK ITS</span>
            </span>
          </Link>
          {online !== undefined && (
            <span className={`status-pill ${online ? "on" : "off"}`}>
              <span className="dot" />
              <span>{online ? "Terhubung" : "Terputus"}</span>
            </span>
          )}
          <ThemeToggle compact />
          {right}
        </div>
      </header>
    </>
  );
}
