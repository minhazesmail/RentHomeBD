import { privateMetadata } from "@/lib/site-metadata";
import "./styles.css";

export default function SavedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

export const metadata = privateMetadata("Saved homes");
