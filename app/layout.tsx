import type { Metadata } from "next";
import StoreProvider from "./storeProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";
import RouteChangeHandler from "./RouteChangeHandler";
import AuthModal from "./components/authModal";
import PasswordModal from "./components/passwordModal";
import { SITE_NAME, SITE_URL, TWITTER_HANDLE } from "./siteConfig";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Build tier lists on anything. Share them with friends and see exactly where you agree — and where you clash.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/preview.png",
        width: 1200,
        height: 630,
        alt: "tierstack.dev tier list preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: TWITTER_HANDLE,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster position="top-right" expand richColors />
        <StoreProvider>
          <RouteChangeHandler />
          <AuthModal />
          <PasswordModal />
          {children}
          <Analytics />
          <SpeedInsights />
        </StoreProvider>
      </body>
    </html>
  );
}
