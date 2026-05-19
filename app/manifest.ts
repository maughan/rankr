import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_URL } from "./siteConfig";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Tierstack",
    description:
      "Build tier lists on anything. Share them with friends and see exactly where you agree — and where you clash.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A1220",
    theme_color: "#4A8AE8",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
