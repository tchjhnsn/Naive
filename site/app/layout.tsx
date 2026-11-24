import type { Metadata } from "next";
import { Anton, Geist, Geist_Mono } from "next/font/google";
import { Head } from "nextra/components";
import { ThemeProvider } from "next-themes";
import { SiteFooter } from "@/components/shell/footer";
import { SiteHeader } from "@/components/shell/header";
import { siteUrl } from "@/lib/site";
import "./global.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
// Heavy condensed display face for marketing headlines (brand direction: bold, direct). OFL.
// Not preloaded: only marketing pages use it, so docs routes do not fetch it.
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Naive", template: "%s · Naive" },
  description: "Draft docs and marketing pages for Naive. Not indexed until the owner approves.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${anton.variable}`} suppressHydrationWarning>
      <Head
        backgroundColor={{ light: "#ffffff", dark: "#0a0a0a" }}
        color={{
          hue: { light: 213, dark: 213 },
          saturation: { light: 64, dark: 48 },
          lightness: { light: 32, dark: 72 },
        }}
      />
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange storageKey="theme">
          <SiteHeader />
          {children}
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
