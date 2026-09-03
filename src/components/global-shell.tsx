"use client";

import { usePathname } from "next/navigation";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";

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

function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/homes") || value.startsWith("//")) return null;
  return value;
}

export function GlobalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shell = resolveShell(pathname);
  const isPropertyDetail = /^\/homes\/[^/]+$/.test(pathname);

  function handleShellClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (!isPropertyDetail) return;
    const target = event.target as HTMLElement;
    const anchor = target.closest("a");
    if (!anchor) return;
    if (anchor.getAttribute("href") !== "/homes" || !anchor.textContent?.includes("Back to map")) return;

    const returnTo = safeReturnTo(new URLSearchParams(window.location.search).get("returnTo"));
    if (!returnTo) return;

    event.preventDefault();
    window.location.assign(returnTo);
  }

  return (
    <div className={`nb-global-shell nb-global-shell--${shell}`} data-shell={shell} data-route={pathname} onClickCapture={handleShellClick}>
      <div className="nb-shell-atmosphere" aria-hidden="true" />
      <div className="nb-shell-grid" aria-hidden="true" />
      <div className="nb-shell-content">
        <div className="nb-route-stage" data-route-stage={shell} key={pathname}>{children}</div>
      </div>
    </div>
  );
}
