import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrl) {
  throw new Error(
    "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL. " +
      "Copy .env.example to .env.local and set the values for your Supabase project.",
  );
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: new URL(supabaseUrl).hostname,
        pathname: "/storage/v1/object/sign/property-media/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
