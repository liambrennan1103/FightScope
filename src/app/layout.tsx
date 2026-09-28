import type { Metadata } from "next";
import { Archivo_Black, Geist, Geist_Mono, Open_Sans, Oswald } from "next/font/google";
import { AccountProvider } from "@/components/providers/AccountProvider";
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
});

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  subsets: ["latin"],
  weight: "400",
});

// Use the variable Open Sans face (omit static weight[]). Turbopack's google-font
// replacer errors with "queries have exactly one entry" when multiple static
// weights are requested after a stale/mixed .next cache.
const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
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
          {children}
        </AccountProvider>
      </body>
    </html>
  );
}
