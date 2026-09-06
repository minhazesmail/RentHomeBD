import Image from "next/image";
import Link from "next/link";

export function BrandLogo({ className = "" }: { className?: string }) {
  const classes = ["brand-logo", className].filter(Boolean).join(" ");

  return (
    <Link className={classes} href="/" aria-label="NearBasha home">
      <Image src="/nearbasha-logo.svg" alt="NearBasha" width={240} height={70} priority />
    </Link>
  );
}
