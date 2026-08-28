import Link from "next/link";

import { RenterMapSearch } from "@/components/renter-map-search";
import "./homes.css";

export const dynamic = "force-dynamic";

export default function HomesPage() {
  return (
    <main className="homes-page">
      <header className="homes-topbar">
        <Link className="homes-brand" href="/">RentHomeBD</Link>
        <div className="homes-topbar-actions">
          <span>Verified availability · exact pins</span>
          <Link className="text-link" href="/login">Sign in</Link>
        </div>
      </header>
      <RenterMapSearch />
    </main>
  );
}
