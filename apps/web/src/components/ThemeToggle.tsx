"use client";
import { useEffect, useState } from "react";

export function ThemeToggle({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("pkrk_theme") as "dark" | "light" | null;
    const initial = saved || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("pkrk_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  if (!mounted) {
    return (
      <button type="button" className={`theme-toggle-btn ${className}`} aria-label="Ganti tema">
        <span className="theme-icon">🌙</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      title={theme === "dark" ? "Beralih ke Tema Terang" : "Beralih ke Tema Gelap"}
      aria-label="Ganti tema tampilan"
    >
      <span className="theme-icon">{theme === "dark" ? "🌙" : "☀️"}</span>
      {!compact && (
        <span className="theme-text">
          {theme === "dark" ? "Tema Gelap" : "Tema Terang"}
        </span>
      )}
    </button>
  );
}
