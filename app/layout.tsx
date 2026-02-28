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
  manifest: "/ultimate.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RickFlix",
  },
  icons: {
    icon: "/final-v3/icon-512.png",
    apple: "/final-v3/apple-touch-icon.png",
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
        <link rel="manifest" href="/ultimate.webmanifest" />
        <link rel="apple-touch-icon" href="/final-v3/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
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
