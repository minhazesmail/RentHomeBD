import type { Metadata } from "next";
import { Hind_Siliguri, Inter } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./styles.css";

import { GlobalShell } from "@/components/global-shell";
import { LocalizedSkipLink } from "@/components/localized-skip-link";
import { getLocale } from "@/i18n/get-locale";
import { LocaleProvider } from "@/i18n/locale-provider";
import { getThemePreference } from "@/theme/get-theme";
import { ThemeProvider } from "@/theme/theme-provider";

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
  const themePreference = await getThemePreference();
  const initialResolvedTheme = themePreference === "dark" ? "dark" : "light";

  return (
    <html
      lang={locale}
      data-theme={themePreference}
      data-resolved-theme={initialResolvedTheme}
      className={`${inter.variable} ${hindSiliguri.variable}`}
    >
      <body>
        <LocaleProvider initialLocale={locale}>
          <ThemeProvider initialPreference={themePreference}>
            <LocalizedSkipLink />
            <div id="main-content" tabIndex={-1}>
              <GlobalShell>{children}</GlobalShell>
            </div>
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
