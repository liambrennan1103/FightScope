import type { Metadata } from "next";
import { Archivo_Black, Geist, Geist_Mono, Open_Sans, Oswald } from "next/font/google";
import { AccountProvider } from "@/components/providers/AccountProvider";
import { GlobalCursor } from "@/components/providers/GlobalCursor";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  subsets: ["latin"],
  weight: "400",
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "FightScope",
    template: "%s · FightScope",
  },
  description: "MMA predictions, fighter analytics and matchup breakdowns.",
  openGraph: {
    title: "FightScope — Know the fight before it happens.",
    description: "MMA predictions, fighter analytics and matchup breakdowns.",
    type: "website",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} ${archivoBlack.variable} ${openSans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-ink">
        <AccountProvider user={null}>
          <GlobalCursor />
          {children}
        </AccountProvider>
      </body>
    </html>
  );
}
