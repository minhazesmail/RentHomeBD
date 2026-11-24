import { privateMetadata } from "@/lib/site-metadata";
import "./styles.css";

export default function ModerationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

export const metadata = privateMetadata("Moderation");
