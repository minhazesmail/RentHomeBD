import { privateMetadata } from "@/lib/site-metadata";
import "./styles.css";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

export const metadata = privateMetadata("Dashboard");
