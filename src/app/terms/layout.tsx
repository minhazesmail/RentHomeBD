import { getLocale } from "@/i18n/get-locale";
import { publicMetadata } from "@/lib/site-metadata";
import "../information-styles.css";

export default function TermsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

export async function generateMetadata() {
  return publicMetadata("/terms", await getLocale());
}
