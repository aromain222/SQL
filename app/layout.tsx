import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SQL — Natural Language Data Analysis",
  description: "Upload a dataset, ask questions in plain English.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8f9fa]">{children}</body>
    </html>
  );
}
