import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rifa Online",
  description: "Escolha seus números, pague no PIX e concorra!",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-neutral-950 text-neutral-100">{children}</body>
    </html>
  );
}
