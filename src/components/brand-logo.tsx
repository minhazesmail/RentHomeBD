import Image from "next/image";
import Link from "next/link";

export function BrandLogo({ className = "brand-logo" }: { className?: string }) {
  return (
    <Link className={className} href="/" aria-label="NearBasha home">
      <Image src="/nearbasha-logo.svg" alt="NearBasha" width={240} height={70} priority />
    </Link>
  );
}
