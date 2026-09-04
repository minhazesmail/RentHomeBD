import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

type ActionVariant = "primary" | "secondary" | "text";

function actionClassName(variant: ActionVariant, className?: string) {
  const baseClass = variant === "text" ? "text-link" : `${variant}-button link-button`;
  return [baseClass, className].filter(Boolean).join(" ");
}

export type ActionLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  variant?: ActionVariant;
};

export function ActionLink({ variant = "primary", className, ...props }: ActionLinkProps) {
  return <Link {...props} className={actionClassName(variant, className)} />;
}

export type ActionButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: ActionVariant;
};

export function ActionButton({ variant = "primary", className, ...props }: ActionButtonProps) {
  const baseClass = variant === "text" ? "text-button" : `${variant}-button`;
  return <button {...props} className={[baseClass, className].filter(Boolean).join(" ")} />;
}
