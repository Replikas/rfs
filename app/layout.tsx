import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MaintenancePage from "./components/MaintenancePage";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RickFlix - Stream All Rick and Morty Episodes",
  description: "Watch all 81 episodes of Rick and Morty across 8 seasons. Wubba Lubba Dub Dub!",
};

// Hardcoded maintenance mode - change to false when ready
const isMaintenanceMode = false; // process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {isMaintenanceMode ? <MaintenancePage /> : children}
      </body>
    </html>
  );
}
