import type { Metadata } from "next";
import { Hind_Siliguri, Inter } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./tokens.css";
import "./globals.css";
import "./typography.css";
import "./design-system.css";
import "./ui-refresh.css";
import "./brand.css";
import "./auth-polish.css";
import "./owner-location.css";
import "./listing-readiness.css";
import "./messages-realtime.css";

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
    default: "RentHomeBD",
    template: "%s | RentHomeBD",
  },
  description: "Find verified homes and apartments near you on a live map across Bangladesh.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${hindSiliguri.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <div id="main-content" tabIndex={-1}>{children}</div>
      </body>
    </html>
  );
}
