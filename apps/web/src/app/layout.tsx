import type { Metadata } from "next";
import { Bungee, Poppins } from "next/font/google";
import "./globals.css";

const display = Bungee({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Monitoring Air Tambak ABMAS PKRK",
  description:
    "Pantau kualitas air tambak bandeng dan udang secara real-time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${display.variable} ${body.variable}`} data-theme="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}