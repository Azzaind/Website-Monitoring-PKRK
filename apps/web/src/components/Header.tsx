import Link from "next/link";
import type { ReactNode } from "react";

export default function Header({ online, right }: { online?: boolean; right?: ReactNode }) {
  return (
    <>
      <div className="tape" />
      <header className="hdr">
        <div className="wrap">
          <Link href="/" className="brand" aria-label="Kembali ke halaman utama">
            <span className="mark">P</span>
            <span>
              <span className="ttl">Monitoring Air Tambak</span>
              <span className="sub">ABMAS PKRK ITS</span>
            </span>
          </Link>
          {online !== undefined && (
            <span className={`pill ${online ? "on" : ""}`}>
              <i className="dot" />
              {online ? "Terhubung" : "Terputus"}
            </span>
          )}
          {right}
        </div>
      </header>
    </>
  );
}