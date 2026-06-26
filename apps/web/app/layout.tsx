import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL ||
      "https://aside-melissas-projects-6a8130ee.vercel.app",
  ),
  title: "Aside — developer curiosities in your status line",
  description:
    "Aside shows short developer curiosities in the Claude Code status line while the AI thinks. Local-first, open source, privacy-preserving.",
  openGraph: {
    title: "Aside — developer curiosities in your status line",
    description:
      "Short developer curiosities in the Claude Code status line, while the AI thinks. Local-first, open source, privacy-preserving.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
