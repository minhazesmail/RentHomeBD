import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";

// Verified public origin; never derive canonical URLs from request headers.
export const SITE_ORIGIN = "https://rent-home-bd.vercel.app";
export const PUBLIC_PATHS = ["/", "/homes", "/about", "/contact", "/privacy", "/terms"] as const;
type PublicPath = typeof PUBLIC_PATHS[number];
const copy: Record<PublicPath, Record<Locale, { title: string; description: string }>> = {
  "/": {
    en: { title: "Rental homes in Bangladesh", description: "Find flats and private rooms across Bangladesh by area, monthly rent and tenant type on NearBasha." },
    bn: { title: "বাংলাদেশে ভাড়ার বাসা", description: "NearBasha-তে এলাকা, মাসিক ভাড়া ও ভাড়াটিয়ার ধরন অনুযায়ী ফ্ল্যাট ও রুম খুঁজুন।" },
  },
  "/homes": {
    en: { title: "Search rental homes on the map", description: "Explore rental homes and private rooms by location, rent and accepted tenant type in Bangladesh." },
    bn: { title: "ম্যাপে ভাড়ার বাসা খুঁজুন", description: "এলাকা, ভাড়া ও ভাড়াটিয়ার ধরন অনুযায়ী বাসা ও আলাদা রুম খুঁজুন।" },
  },
  "/about": {
    en: { title: "About", description: "Learn how NearBasha helps renters and property owners find and list rental homes in Bangladesh." },
    bn: { title: "আমাদের সম্পর্কে", description: "NearBasha-তে কীভাবে ভাড়ার বাসা খুঁজবেন ও তালিকাভুক্ত করবেন জানুন।" },
  },
  "/contact": {
    en: { title: "Contact and support", description: "Get help with account access, OTP delivery, safety reports and privacy requests." },
    bn: { title: "যোগাযোগ ও সহায়তা", description: "অ্যাকাউন্ট, OTP, নিরাপত্তা ও ব্যক্তিগত তথ্যের বিষয়ে সহায়তা নিন।" },
  },
  "/privacy": {
    en: { title: "Privacy policy", description: "Learn how NearBasha uses account, listing, location and messaging information and how to request your data." },
    bn: { title: "গোপনীয়তা নীতি", description: "NearBasha কীভাবে অ্যাকাউন্ট, বাসার তালিকা, অবস্থান ও মেসেজের তথ্য ব্যবহার করে জানুন।" },
  },
  "/terms": {
    en: { title: "Terms of use", description: "Read NearBasha's marketplace rules, user responsibilities and rental safety guidance." },
    bn: { title: "ব্যবহারের শর্তাবলি", description: "NearBasha ব্যবহারের নিয়ম, ব্যবহারকারীর দায়িত্ব ও নিরাপত্তার নির্দেশনা পড়ুন।" },
  },
};
export function isPreviewDeployment() {
  return process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development";
}
export function publicMetadata(path: PublicPath, locale: Locale, index = true): Metadata {
  const { title, description } = copy[path][locale];
  const canonical = new URL(path, SITE_ORIGIN).href;
  const allowIndex = index && !isPreviewDeployment();
  return {
    title: path === "/" ? { absolute: `${title} | NearBasha` } : title,
    description, alternates: { canonical },
    robots: { index: allowIndex, follow: allowIndex },
    openGraph: { type: "website", siteName: "NearBasha", title: `${title} | NearBasha`, description, url: canonical, locale: locale === "bn" ? "bn_BD" : "en_BD" },
    twitter: { card: "summary", title: `${title} | NearBasha`, description },
  };
}
export function privateMetadata(title: string): Metadata {
  return { title, robots: { index: false, follow: false } };
}
