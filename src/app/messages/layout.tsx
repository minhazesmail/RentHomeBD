import { privateMetadata } from "@/lib/site-metadata";
import "./styles.css";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}

export const metadata = privateMetadata("Messages");
