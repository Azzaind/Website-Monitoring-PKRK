"use client";
import { useEffect, useState } from "react";
import { getSensors, getHistory, downloadCsv, errText, type Sensor, type Reading } from "@/lib/api";
import { fmtWib } from "@/lib/params";

const wibDate = (offsetDays = 0) =>
  new Date(Date.now() - offsetDays * 864e5).toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });

export default function ExportPanel({ onExpired }: { onExpired: () => void }) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [name, setName] = useState("");
  const [start, setStart] = useState(wibDate());
  const [end, setEnd] = useState(wibDate());
  const [rows, setRows] = useState<Reading[] | null>(null);
  const [unit, setUnit] = useState("");
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getSensors()
      .then((s) => {
        const act = s.filter((x) => x.isActive !== false);
        setSensors(act);
        if (act[0]) setName(act[0].name);
      })
      .catch((e) => setErr(errText(e)));
  }, []);

  // pratinjau dibersihkan jika filter berubah
  useEffect(() => setRows(null), [name, start, end]);

  const valid = !!name && !!start && !!end && start <= end;

  async function show() {
    setBusy(true);
    setErr("");
    try {
      const r = await getHistory(name, start, end);
      setRows(r.data);
      setUnit(r.sensor.unit);
      setTotal(r.totalRecords);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    setErr("");
    try {
      await downloadCsv(name, start, end);
    } catch (e) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") onExpired();
      else setErr(errText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" id="unduh">
      <h2>Unduh data</h2>
      <p className="meta">Pilih sensor dan tanggal (WIB), tampilkan pratinjau, lalu unduh CSV.</p>

      <div className="form">
        <label>
          Sensor
          <select value={name} onChange={(e) => setName(e.target.value)}>
            {sensors.map((s) => (
              <option key={s.id} value={s.name}>{s.name} ({s.unit})</option>
            ))}
          </select>
        </label>
        <label>
          Dari tanggal
          <input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          Sampai tanggal
          <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>

      <div className="row">
        <button className="btn ghost sm" onClick={() => { setStart(wibDate()); setEnd(wibDate()); }}>Hari ini</button>
        <button className="btn ghost sm" onClick={() => { setStart(wibDate(6)); setEnd(wibDate()); }}>7 hari terakhir</button>
        <button className="btn sm" disabled={!valid || busy} onClick={show}>Tampilkan data</button>
        <button className="btn sm" disabled={!valid || busy || !rows?.length} onClick={download}>Unduh CSV</button>
      </div>

      {err && <p className="msg err" role="alert">{err}</p>}

      {rows && rows.length === 0 && <p className="msg">Tidak ada data pada rentang ini. Ubah tanggal lalu coba lagi.</p>}

      {rows && rows.length > 0 && (
        <>
          <p className="meta" style={{ margin: "16px 0 8px" }}>
            Menampilkan {Math.min(rows.length, 100)} dari {total} data. File CSV memuat semua data.
          </p>
          <div className="tablebox" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  {["No", "Sensor", "Value", "Unit", "Recorded At (WIB)", "Received At (WIB)", "External ID"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((r, k) => (
                  <tr key={r.id}>
                    <td>{k + 1}</td>
                    <td>{name}</td>
                    <td>{r.value}</td>
                    <td>{unit}</td>
                    <td>{fmtWib(r.recordedAt)}</td>
                    <td>{fmtWib(r.receivedAt)}</td>
                    <td>{r.externalId ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}