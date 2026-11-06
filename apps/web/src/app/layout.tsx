import type { Metadata } from "next";
import { Bungee, DM_Sans } from "next/font/google";
import "./globals.css";

const display = Bungee({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Monitoring Air Tambak ABMAS PKRK",
  description: "Pantau kualitas air tambak bandeng dan udang secara real-time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}