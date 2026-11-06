import Link from "next/link";
import Header from "@/components/Header";

const PARAMS = ["Suhu", "Oksigen terlarut", "pH", "Salinitas", "Kekeruhan", "Level air", "Lokasi"];

export default function Home() {
  return (
    <>
      <Header />
      <main className="wrap">
        <section className="hero">
          <h1>Kualitas air tambak</h1>
          <p>Data sensor dari tambak bandeng dan udang tampil langsung.</p>
        </section>

        <section className="choices" aria-label="Pilih halaman">
          <div className="choice pub">
            <h2>Untuk publik</h2>
            <p>Lihat kondisi air terbaru yang diperbarui langsung dari sensor.</p>
            <Link className="btn" href="/monitoring">Monitoring</Link>
          </div>
          <div className="choice adm">
            <h2>Untuk admin</h2>
            <p>Pantau data yang sama, lalu pilih tanggal, lihat pratinjau, dan unduh data dalam CSV.</p>
            <Link className="btn" href="/admin">Admin Monitoring</Link>
          </div>
        </section>

        <section className="params">
          <h2>Parameter yang dipantau</h2>
          <div className="chips">
            {PARAMS.map((p) => <span key={p} className="chip">{p}</span>)}
          </div>
        </section>
      </main>
    </>
  );
}