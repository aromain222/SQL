import type { Metadata } from "next";
import { Inter, Fira_Code } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DataChat — Finance Analytics in Plain English",
  description: "Upload a CSV, ask questions in plain English, get analyst-quality answers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${firaCode.variable}`}>
      <body className="min-h-screen bg-[#f8fafc] antialiased">{children}</body>
    </html>
  );
}
