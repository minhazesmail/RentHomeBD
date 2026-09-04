import type { Metadata } from "next";
import { Hind_Siliguri, Inter } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./styles.css";

import { GlobalShell } from "@/components/global-shell";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["400", "600"],
  display: "swap",
  preload: false,
  variable: "--font-hind-siliguri",
});

export const metadata: Metadata = {
  title: {
    default: "NearBasha",
    template: "%s | NearBasha",
  },
  description: "Search moderated rental homes on a live map in Dhaka. NearBasha is a Bangladesh-focused rental marketplace launching first in Dhaka.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${hindSiliguri.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <div id="main-content" tabIndex={-1}>
          <GlobalShell>{children}</GlobalShell>
        </div>
      </body>
    </html>
  );
}
