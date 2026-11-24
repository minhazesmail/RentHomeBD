import { privateMetadata } from "@/lib/site-metadata";
import "./styles.css";

export default function OwnerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

export const metadata = privateMetadata("Manage properties");
