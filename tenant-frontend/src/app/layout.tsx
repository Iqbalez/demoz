import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Demoz — Intelligent HR & Payroll for Ethiopian Enterprises",
  description:
    "Demoz is Ethiopia's modern B2B payroll, attendance, and HR management platform. Automated tax compliance, geofenced attendance, and Chapa bulk payouts.",
  keywords: ["HR software Ethiopia", "payroll platform", "ERCA compliance", "POESSA pension", "workforce management"],
  openGraph: {
    title: "Demoz — HR & Payroll Platform",
    description: "Automated, compliant payroll for Ethiopian enterprises.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
