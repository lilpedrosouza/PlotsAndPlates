import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { sofiaCondensed } from "@/styles/fonts-micro";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PlotsAndPlates", template: "%s · PAP" },
  description: "O diário a dois do que a gente come e assiste.",
  applicationName: "PAP",
  appleWebApp: { capable: true, title: "PAP", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3e9d6",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={sofiaCondensed.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
