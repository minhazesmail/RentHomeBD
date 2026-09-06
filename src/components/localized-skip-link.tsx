"use client";

import { useLocale } from "@/i18n/use-locale";

export function LocalizedSkipLink() {
  const { dictionary } = useLocale();
  return (
    <a className="skip-link" href="#main-content">
      {dictionary.common.skipToMain}
    </a>
  );
}
