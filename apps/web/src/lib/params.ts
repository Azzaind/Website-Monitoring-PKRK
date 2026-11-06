export type Species = "bandeng" | "vaname" | "windu";
export type Status = "low" | "ok" | "high";
type R = [number, number];

export const SPECIES: Record<Species, string> = {
  bandeng: "Bandeng",
  vaname: "Udang Vaname",
  windu: "Udang Windu",
};

export interface ParamDef {
  label: string;
  match: RegExp; // dicocokkan dengan nama sensor dari BE
  ranges: Record<Species, R>;
  low: string;
  high: string;
  digits: number;
}

const all = (r: R): Record<Species, R> => ({ bandeng: r, vaname: r, windu: r });

// Rentang optimal mengikuti Tabel Pengambilan Keputusan pada To Do List
export const PARAMS: ParamDef[] = [
  { label: "Suhu", match: /suhu|temp/i, ranges: { bandeng: [27, 30], vaname: [26, 30], windu: [26, 30] }, low: "Pantau dan hindari penambahan air dingin.", high: "Nyalakan pompa sirkulasi atau tambah air baru.", digits: 1 },
  { label: "Oksigen terlarut", match: /oksigen|oxygen|dissolved|^do\b/i, ranges: { bandeng: [5, 8], vaname: [5, 7], windu: [5, 7] }, low: "Aktifkan aerator.", high: "Kurangi aerasi.", digits: 2 },
  { label: "pH", match: /^ph\b|\bph\b/i, ranges: all([7.5, 8.5]), low: "Air bersifat asam, periksa sumber air.", high: "Air bersifat basa, ganti sebagian air.", digits: 2 },
  { label: "Salinitas", match: /salin|conduct|\bec\b/i, ranges: { bandeng: [15, 25], vaname: [5, 6], windu: [20, 28] }, low: "Masukkan air laut saat pasang.", high: "Tunggu air laut surut atau tambah air tawar.", digits: 1 },
  { label: "Kekeruhan", match: /keruh|turb/i, ranges: all([12.5, 13]), low: "Air terlalu jernih, pantau pakan alami.", high: "Buka saluran pembuangan atau lakukan pergantian air.", digits: 1 },
  { label: "Level air", match: /level|tinggi|ketinggian/i, ranges: { bandeng: [80, 120], vaname: [50, 70], windu: [50, 70] }, low: "Tambah air saat pasang.", high: "Alirkan air keluar saat surut.", digits: 0 },
];

export const findParam = (name: string) => PARAMS.find((p) => p.match.test(name));
export const rangeOf = (d: ParamDef, s: Species) => d.ranges[s];

export function statusOf(v: number, d: ParamDef, s: Species): Status {
  const [lo, hi] = d.ranges[s];
  return v < lo ? "low" : v > hi ? "high" : "ok";
}

export const fmt = (v: number, d?: ParamDef) => v.toFixed(d?.digits ?? 2);

export const fmtWib = (iso: string) =>
  iso ? new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "-";