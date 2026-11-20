"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LiveDashboard from "@/components/LiveDashboard";
import ExportPanel from "@/components/ExportPanel";
import GeofenceConfigPanel from "@/components/GeofenceConfigPanel";
import { auth, type AdminUser } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (auth.valid()) {
      setOk(true);
      setUser(auth.getUser());
    } else {
      router.replace("/admin/login");
    }
  }, [router]);

  const logout = () => {
    auth.clear();
    router.replace("/admin/login");
  };

  if (!ok) {
    return (
      <main className="login" style={{ minHeight: "100vh" }}>
        <p className="msg">Memeriksa sesi login admin…</p>
      </main>
    );
  }

  return (
    <LiveDashboard
      title="Admin Monitoring & Konfigurasi"
      right={
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {user && (
            <span style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
              Admin: <b style={{ color: "var(--text)" }}>{user.name}</b>
            </span>
          )}
          <button type="button" className="btn ghost sm" onClick={logout}>
            Keluar
          </button>
        </div>
      }
    >
      <GeofenceConfigPanel onExpired={logout} />
      <ExportPanel onExpired={logout} />
    </LiveDashboard>
  );
}
