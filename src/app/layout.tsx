import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prime Broker — Simulador de Trading",
  description: "Plataforma profissional de simulação de trading com dados de mercado em tempo real. Cripto e Forex.",
  keywords: ["trading", "simulador", "cripto", "forex", "bitcoin", "opções binárias"],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Prime Broker — Simulador de Trading",
    description: "Opera cripto e forex com $1.000 virtuais. Dados reais. Sem risco.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#080c14] text-white flex flex-col">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
