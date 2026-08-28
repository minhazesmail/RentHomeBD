import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./design-system.css";
import "./brand.css";
import "./auth-polish.css";

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
