"use client";
import "../app/animations.css";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/** Elemen muncul halus saat masuk layar ketika di-scroll (sekali saja). */
export function Reveal({
  children,
  delay = 0,
  className = "",
  id,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      id={id}
      className={`reveal ${className}`}
      style={{ "--d": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

/* ---------- Scroll halus dengan easing (ease in out) ---------- */

/** Tinggi top bar (diukur langsung) ditambah sedikit ruang napas. */
export function topbarOffset() {
  const bar = document.querySelector<HTMLElement>(".dashboard-topbar");
  return (bar?.offsetHeight ?? 76) + 12;
}

/** Posisi atas elemen terhadap dokumen berdasarkan tata letak, tidak terpengaruh transform animasi. */
export function sectionTop(id: string): number | null {
  const el = document.getElementById(id);
  if (!el) return null;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n) {
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return y;
}
const RESPECT_REDUCED_MOTION = false; // true = patuhi pengaturan animasi sistem
let rafId = 0;

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function cancelEaseScroll() {
  cancelAnimationFrame(rafId);
  document.documentElement.style.scrollBehavior = "";
}

/** Gulir ke posisi (angka) atau ke elemen (id) dengan percepatan dan perlambatan halus. */
export function easeScrollTo(target: number | string, onDone?: () => void) {
  const root = document.documentElement;
  let y1: number;
  if (typeof target === "number") {
    y1 = target;
  } else {
    const top = sectionTop(target);
    if (top === null) return;
    y1 = top - topbarOffset();
  }
  y1 = Math.max(0, Math.min(y1, root.scrollHeight - window.innerHeight));

  const y0 = window.scrollY;
  const dist = y1 - y0;
  cancelEaseScroll();

  const reduce = RESPECT_REDUCED_MOTION && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (Math.abs(dist) < 2 || reduce) {
    window.scrollTo(0, y1);
    onDone?.();
    return;
  }

  const dur = Math.min(1400, 600 + Math.abs(dist) * 0.25);
  const t0 = performance.now();
  root.style.scrollBehavior = "auto"; // matikan smooth bawaan CSS agar tidak bentrok

  const stop = () => {
    cancelEaseScroll();
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("keydown", stop);
  };
  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("keydown", stop);

  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / dur);
    window.scrollTo(0, y0 + dist * easeInOutCubic(p));
    if (p < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      stop();
      onDone?.();
    }
  };
  rafId = requestAnimationFrame(step);
}

/** Klik tautan #bagian: gulir ber-easing. */
export function useSectionFocus() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="#"]');
      const id = a?.getAttribute("href")?.slice(1);
      if (!id || !document.getElementById(id)) return;
      e.preventDefault();
      history.replaceState(null, "", `#${id}`);
      easeScrollTo(id);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
}

/** Efek "pop" pada tombol, tautan sidebar, dan elemen role=button saat diklik. */
export function useButtonFx() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const b = (e.target as HTMLElement).closest?.(
        'button, .btn, [role="button"], a[href^="#"], nav a, aside a'
      ) as HTMLElement | null;
      if (!b || (b as HTMLButtonElement).disabled) return;
      b.classList.remove("fx-pop");
      void b.offsetWidth; // memulai ulang animasi
      b.classList.add("fx-pop");
      setTimeout(() => b.classList.remove("fx-pop"), 500);

      // Riak gelombang dari titik klik
      const r = b.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2;
      const x = e.detail === 0 ? r.width / 2 : e.clientX - r.left;
      const y = e.detail === 0 ? r.height / 2 : e.clientY - r.top;
      const dot = document.createElement("span");
      dot.className = "fx-ripple";
      dot.style.cssText = `width:${size}px;height:${size}px;left:${x - size / 2}px;top:${y - size / 2}px`;
      const prevPos = b.style.position;
      const prevOv = b.style.overflow;
      if (getComputedStyle(b).position === "static") b.style.position = "relative";
      b.style.overflow = "hidden";
      b.appendChild(dot);
      setTimeout(() => {
        dot.remove();
        b.style.position = prevPos;
        b.style.overflow = prevOv;
      }, 700);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
}