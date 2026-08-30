import Image from "next/image";
import Link from "next/link";

export function BrandLogo({ className = "brand-logo" }: { className?: string }) {
  return (
    <Link className={className} href="/" aria-label="RentHomeBD home">
      <Image src="/renthomebd-logo.svg" alt="RentHomeBD" width={254} height={70} priority />
    </Link>
  );
}
