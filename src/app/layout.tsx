import type { Metadata } from "next";
import { Geist_Mono, Khand, Mukta } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { PwaProvider } from "@/components/pwa/pwa-provider";

const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["latin", "devanagari"],
  weight: ["300", "400", "500", "600", "700"],
});

const khand = Khand({
  variable: "--font-khand",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CivicChain Nepal — Civic Accountability Platform",
  description:
    "CivicChain turns citizen reports into trackable, verifiable public issues — improving accountability, transparency, and prioritization across Nepal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${mukta.variable} ${khand.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster richColors position="top-center" />
        <PwaProvider />
      </body>
    </html>
  );
}
