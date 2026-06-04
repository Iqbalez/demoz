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
  title: "Demoz | HR & Payroll for Ethiopian Teams",
  description:
    "Run ERCA-ready payroll, attendance, and Chapa salary disbursements in one place. Built for Ethiopian companies that are done with spreadsheet month end.",
  keywords: ["HR software Ethiopia", "payroll platform", "ERCA compliance", "POESSA pension", "workforce management"],
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Demoz | HR & Payroll Platform",
    description: "Automated, compliant payroll for Ethiopian enterprises.",
    type: "website",
  },
};

import Providers from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
