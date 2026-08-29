import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./tokens.css";
import "./globals.css";
import "./design-system.css";
import "./ui-refresh.css";
import "./brand.css";
import "./auth-polish.css";
import "./owner-location.css";
import "./listing-readiness.css";

export const metadata: Metadata = {
  title: {
    default: "NearBasha",
    template: "%s | NearBasha",
  },
  description: "Find verified homes and apartments near you on a live map across Bangladesh.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
