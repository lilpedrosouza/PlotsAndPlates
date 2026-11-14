import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PlotsAndPlates",
    short_name: "PAP",
    description: "O diário a dois do que a gente come e assiste.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3e9d6",
    theme_color: "#f3e9d6",
    categories: ["lifestyle", "food", "entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Plates", url: "/plates", description: "Restaurantes e pratos" },
      { name: "Plots", url: "/plots", description: "Filmes e séries" },
    ],
  };
}
