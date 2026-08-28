import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "naoarepmcfdnxehbdios.supabase.co",
        pathname: "/storage/v1/object/sign/property-media/**",
      },
    ],
  },
};

export default nextConfig;
