import type { MetadataRoute } from "next";
import { isPreviewDeployment, SITE_ORIGIN } from "@/lib/site-metadata";
export default function robots(): MetadataRoute.Robots {
  if (isPreviewDeployment()) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/auth/confirm", "/auth/signout"] }, sitemap: `${SITE_ORIGIN}/sitemap.xml` };
}
