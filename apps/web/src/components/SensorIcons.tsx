import type { ReactNode } from "react";

export function SensorIcon({ name, className = "" }: { name: string; className?: string }): ReactNode {
  const n = name.toLowerCase();

  // Suhu / Temperature
  if (/suhu|temp/i.test(n)) {
    return (
      <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
        <circle cx="11.5" cy="18.5" r="2" fill="currentColor" />
      </svg>
    );
  }

  // Oksigen Terlarut / DO / Bubbles
  if (/oksigen|oxygen|dissolved|^do\b/i.test(n)) {
    return (
      <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8" />
        <circle cx="10" cy="10" r="2" fill="currentColor" />
        <circle cx="14" cy="14" r="1.5" fill="currentColor" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
      </svg>
    );
  }

  // pH
  if (/^ph\b|\bph\b/i.test(n)) {
    return (
      <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2v7.31a2 2 0 0 1-.37 1.17l-4.5 6.42A2 2 0 0 0 6.77 20h10.46a2 2 0 0 0 1.64-3.1l-4.5-6.42A2 2 0 0 1 14 9.31V2" />
        <path d="M8.5 2h7M7 16h10" />
      </svg>
    );
  }

  // Salinitas / Salinity / EC
  if (/salin|conduct|\bec\b/i.test(n)) {
    return (
      <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        <path d="M12 12v6M9 15h6" />
      </svg>
    );
  }

  // Kekeruhan / Turbidity
  if (/keruh|turb/i.test(n)) {
    return (
      <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
        <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
        <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      </svg>
    );
  }

  // Level Air / Water Level
  if (/level|tinggi|ketinggian/i.test(n)) {
    return (
      <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 3v18M15 7h4M15 12h4M15 17h4" />
        <path d="M3 14c1.5 0 2-1 3.5-1s2 1 3.5 1 2-1 3.5-1v7H3v-7z" fill="currentColor" fillOpacity="0.2" />
        <path d="M3 14c1.5 0 2-1 3.5-1s2 1 3.5 1 2-1 3.5-1" />
      </svg>
    );
  }

  // GPS / Satelit / Lokasi
  if (/lokasi|gps|satelit|geofence/i.test(n)) {
    return (
      <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    );
  }

  // Default sensor icon
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
