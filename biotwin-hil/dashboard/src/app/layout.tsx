import type { Metadata } from "next";
import { Geist, Geist_Mono, Lexend } from "next/font/google";
import "./globals.css";
import { SensorProvider } from "@/context/SensorContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "BioTwin-HIL | Virtual Patient Digital Twin Dashboard",
  description:
    "Real-time biosignal simulation, AI persona generation, and FDA-grade validation for hardware-in-the-loop medical device testing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${lexend.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Background glow orbs */}
        <div
          className="glow-orb"
          style={{
            width: 400,
            height: 400,
            top: "10%",
            left: "5%",
            background: "rgba(236, 72, 153, 0.08)",
          }}
        />
        <div
          className="glow-orb"
          style={{
            width: 350,
            height: 350,
            bottom: "20%",
            right: "10%",
            background: "rgba(14, 165, 233, 0.08)",
          }}
        />
        <SensorProvider>
          {children}
        </SensorProvider>
      </body>
    </html>
  );
}
