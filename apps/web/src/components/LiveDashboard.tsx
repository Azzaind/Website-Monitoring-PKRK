"use client";
import { useMemo, useState, type ReactNode } from "react";
import Header from "./Header";
import { useLive } from "@/hooks/useLive";
import { PARAMS, SPECIES, findParam, rangeOf, statusOf, fmt, fmtWib, type Species } from "@/lib/params";

const TAG = { ok: "Optimal", low: "Rendah", high: "Tinggi", na: "Tanpa batas" };
const LEVEL = { good: "Baik", mid: "Sedang", bad: "Buruk" };

function Meter({ v, lo, hi }: { v: number; lo: number; hi: number }) {
  const span = hi - lo, min = lo - span, max = hi + span;
  const p = (x: number) => Math.min(100, Math.max(0, ((x - min) / (max - min)) * 100));
  return (
    <div className="meter" aria-hidden>
      <i className="zone" style={{ left: `${p(lo)}%`, width: `${p(hi) - p(lo)}%` }} />
      <i className="pin" style={{ left: `${p(v)}%` }} />
    </div>
  );
}

export default function LiveDashboard({ title, right, dummy = false, children }: { title: string; right?: ReactNode; dummy?: boolean; children?: ReactNode }) {
  const { data, online, loading } = useLive(dummy);
  const [sp, setSp] = useState<Species>("bandeng");

  const items = useMemo(
    () =>
      Object.values(data)
        .map((d) => {
          const def = findParam(d.name);
          return { ...d, def, st: def ? statusOf(d.value, def, sp) : ("na" as const) };
        })
        .sort((a, b) => (a.def ? PARAMS.indexOf(a.def) : 99) - (b.def ? PARAMS.indexOf(b.def) : 99)),
    [data, sp]
  );

  const bad = items.filter((i) => i.st === "low" || i.st === "high");
  const level = !items.length ? null : bad.length === 0 ? "good" : bad.length === 1 ? "mid" : "bad";
  const last = items.reduce((m, i) => (i.at > m ? i.at : m), "");

  return (
    <>
      <Header online={dummy ? undefined : online} right={right} />
      <main className="wrap page">
        {dummy && (
          <p className="msg" style={{ marginTop: 0, marginBottom: "var(--gap)" }}>
            Data contoh. Halaman ini belum terhubung ke sensor.
          </p>
        )}
        <div className="toolbar">
          <h1 className="ptitle">{title}</h1>
          <div className="seg" role="group" aria-label="Jenis budidaya">
            {(Object.keys(SPECIES) as Species[]).map((k) => (
              <button key={k} aria-pressed={sp === k} onClick={() => setSp(k)}>
                {SPECIES[k]}
              </button>
            ))}
          </div>
        </div>

        {level && (
          <section className={`verdict ${level}`} aria-live="polite">
            <h2>Kondisi air: {LEVEL[level]}</h2>
            {bad.length === 0 ? (
              <p>Semua parameter berada di rentang optimal untuk {SPECIES[sp]}. Tidak perlu tindakan.</p>
            ) : (
              <ul>
                {bad.map((i) => (
                  <li key={i.name}>
                    <b>{i.def!.label} {i.st === "low" ? "rendah" : "tinggi"}.</b> {i.st === "low" ? i.def!.low : i.def!.high}
                  </li>
                ))}
              </ul>
            )}
            <p className="meta">Pembaruan terakhir {fmtWib(last)}</p>
          </section>
        )}

        {!items.length && (
          <p className="msg">
            {loading ? "Memuat data sensor…" : "Belum ada data sensor. Pastikan BE berjalan dan perangkat sudah mengirim data."}
          </p>
        )}

        <div className="grid">
          {items.map((i) => {
            const r = i.def ? rangeOf(i.def, sp) : null;
            return (
              <article key={i.name} className="card">
                <div className="top">
                  <h3>{i.def?.label ?? i.name}</h3>
                  <span className={`tag ${i.st}`}>{TAG[i.st]}</span>
                </div>
                <div className="val">
                  {fmt(i.value, i.def)}
                  <small>{i.unit}</small>
                </div>
                {r && <Meter v={i.value} lo={r[0]} hi={r[1]} />}
                <div className="meta">
                  <span>{r ? `Optimal ${r[0]} sampai ${r[1]} ${i.unit}` : "Belum ada batas optimal"}</span>
                  <span>{fmtWib(i.at)}</span>
                </div>
              </article>
            );
          })}
        </div>

        {children}
      </main>
    </>
  );
}