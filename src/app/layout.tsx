import type { Metadata } from "next";
import { Hind_Siliguri, Inter } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./styles.css";

import { GlobalShell } from "@/components/global-shell";
import { LocalizedSkipLink } from "@/components/localized-skip-link";
import { getLocale } from "@/i18n/get-locale";
import { LocaleProvider } from "@/i18n/locale-provider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${inter.variable} ${hindSiliguri.variable}`}>
      <body>
        <LocaleProvider initialLocale={locale}>
          <LocalizedSkipLink />
          <div id="main-content" tabIndex={-1}>
            <GlobalShell>{children}</GlobalShell>
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
