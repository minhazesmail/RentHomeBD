import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NearBasha",
    short_name: "NearBasha",
    description: "Map-first rental home search for Bangladesh.",
    start_url: "/homes",
    scope: "/",
    display: "standalone",
    background_color: "#f7f9f5",
    theme_color: "#0f6b4d",
    orientation: "portrait-primary",
    categories: ["lifestyle", "navigation", "utilities"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
