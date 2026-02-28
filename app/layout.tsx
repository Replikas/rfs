import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MaintenancePage from "./components/MaintenancePage";
import PortalEffect from "@/components/PortalEffect";

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
  description: "Watch all 81 episodes of Rick and Morty across 8 seasons.",
  manifest: "/nuclear.webmanifest?v=1772262145",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RickFlix",
  },
  icons: {
    icon: "/rf-icon/rf-512.png",
    apple: "/rf-icon/rf-180.png",
  },
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
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=1772262510" />
        <link rel="manifest" href="/nuclear.webmanifest?v=1772262145" />
        <link rel="apple-touch-icon" href="/rf-icon/rf-180.png" />
              <script dangerouslySetInnerHTML={{__html: `
          if ('caches' in window) {
            caches.keys().then(names => names.forEach(name => caches.delete(name)));
          }
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
          }
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PortalEffect />
        {isMaintenanceMode ? <MaintenancePage /> : children}
      </body>
    </html>
  );
}
