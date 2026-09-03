import type { Metadata } from "next";
import { Hind_Siliguri, Inter } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./tokens.css";
import "./globals.css";
import "./primitives.css";
import "./foundation.css";
import "./shells.css";
import "./brand.css";
import "./auth.css";
import "./landing.css";
import "./landing-alignment.css";
import "./homes/homes.css";
import "./homes/homes-redesign.css";
import "./homes/property-detail-redesign.css";
import "./owner/owner.css";
import "./dashboard/dashboard.css";
import "./dashboard/dashboard-redesign.css";
import "./messages/messages.css";
import "./saved/saved.css";

import { GlobalShell } from "@/components/global-shell";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-hind-siliguri",
});

export const metadata: Metadata = {
  title: {
    default: "NearBasha",
    template: "%s | NearBasha",
  },
  description: "Find verified homes and apartments near you on a live map across Bangladesh.",
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
