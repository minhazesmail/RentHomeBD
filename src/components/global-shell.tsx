"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type ShellKind = "marketing" | "renter" | "owner" | "auth" | "neutral";

function resolveShell(pathname: string): ShellKind {
  if (pathname === "/" || pathname.startsWith("/about") || pathname.startsWith("/contact") || pathname.startsWith("/terms") || pathname.startsWith("/privacy")) {
    return "marketing";
  }

  if (pathname.startsWith("/login") || pathname.startsWith("/auth") || pathname.startsWith("/account/phone")) {
    return "auth";
  }

  if (pathname.startsWith("/owner") || pathname.startsWith("/dashboard") || pathname.startsWith("/moderation")) {
    return "owner";
  }

  if (pathname.startsWith("/homes") || pathname.startsWith("/saved") || pathname.startsWith("/messages") || pathname.startsWith("/account")) {
    return "renter";
  }

  return "neutral";
}

export function GlobalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shell = resolveShell(pathname);

  return (
    <div className={`nb-global-shell nb-global-shell--${shell}`} data-shell={shell} data-route={pathname}>
      <div className="nb-shell-atmosphere" aria-hidden="true" />
      <div className="nb-shell-grid" aria-hidden="true" />
      <div className="nb-shell-content">{children}</div>
    </div>
  );
}
