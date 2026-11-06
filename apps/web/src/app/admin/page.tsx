"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LiveDashboard from "@/components/LiveDashboard";
import ExportPanel from "@/components/ExportPanel";
import { auth } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (auth.valid()) setOk(true);
    else router.replace("/admin/login");
  }, [router]);

  const logout = () => {
    auth.clear();
    router.replace("/admin/login");
  };

  if (!ok) return <main className="wrap page"><p className="msg">Memeriksa akses…</p></main>;

  return (
    <LiveDashboard
      title="Admin Monitoring"
      dummy
      right={<button className="btn ghost sm" onClick={logout}>Keluar</button>}
    >
      <ExportPanel onExpired={logout} />
    </LiveDashboard>
  );
}