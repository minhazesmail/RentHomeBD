import { privateMetadata } from "@/lib/site-metadata";
import "../auth-styles.css";

export default function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

export const metadata = privateMetadata("Account");
