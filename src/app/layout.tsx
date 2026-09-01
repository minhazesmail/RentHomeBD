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
import "./qa.css";
import "./landing.css";
import "./landing-refinement.css";
import "./featured-listings.css";
import "./trust-stats.css";
import "./homes/homes.css";
import "./homes/split-pane.css";
import "./homes/mobile-map-sheet.css";
import "./homes/map-markers.css";
import "./homes/custom-area.css";
import "./homes/tenant-match.css";
import "./homes/property-detail.css";
import "./homes/property-detail-polish.css";
import "./homes/trust-verification.css";
import "./homes/phone-reveal.css";
import "./owner/freshness.css";
import "./owner/owner-dashboard-refinement.css";
import "./owner/listing-flow-polish.css";
import "./dashboard/renter-dashboard.css";
import "./messages/messages.css";
import "./saved/saved.css";
import "./premium-ui.css";
import "./reference-ui.css";

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
        <div id="main-content" tabIndex={-1}>{children}</div>
      </body>
    </html>
  );
}
