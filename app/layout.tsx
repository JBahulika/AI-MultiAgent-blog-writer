// app/layout.tsx
import React from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multi-Agent Blog Writer",
  description: "Generate blogs from PRDs with multi-agent AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="overflow-x-hidden">
        <main className="relative min-h-screen w-full">{children}</main>
      </body>
    </html>
  );
}
