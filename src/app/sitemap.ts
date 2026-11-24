import type { MetadataRoute } from "next";
import { isPreviewDeployment, PUBLIC_PATHS, SITE_ORIGIN } from "@/lib/site-metadata";
export default function sitemap(): MetadataRoute.Sitemap {
  if (isPreviewDeployment()) return [];
  // Only stable public routes; listing indexing awaits populated inventory QA.
  return PUBLIC_PATHS.map(path => ({ url: new URL(path, SITE_ORIGIN).href }));
}
