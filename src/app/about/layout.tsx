import { getLocale } from "@/i18n/get-locale";
import { publicMetadata } from "@/lib/site-metadata";
import "../information-styles.css";

export default function AboutLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

export async function generateMetadata() {
  return publicMetadata("/about", await getLocale());
}
