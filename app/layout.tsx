import type { Metadata } from "next";
import { cookies } from "next/headers";
import StoreProvider from "./storeProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";
import RouteChangeHandler from "./RouteChangeHandler";
import AuthModal from "./components/authModal";
import PasswordModal from "./components/passwordModal";
import FooterWrapper from "./components/FooterWrapper";
import QueryProvider from "./components/QueryProvider";
import PostHogProvider from "./components/PostHogProvider";
import OnboardingBanner from "./components/OnboardingBanner";
import AnnouncementBanner from "./components/AnnouncementBanner";
import HttpInterceptor from "./components/HttpInterceptor";
import SessionExpiredNotifier from "./components/SessionExpiredNotifier";
import ImpersonationBanner from "./components/ImpersonationBanner";
import { ImpersonationProvider } from "./components/ImpersonationProvider";
import { getImpersonationPayload } from "@/lib/server/impersonation";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const biscuits = await cookies();
  const obState = biscuits.get("rk_ob_state")?.value;

  // Impersonation state — decoded server-side, passed to client components.
  const imp = await getImpersonationPayload();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <Toaster position="top-right" expand richColors />
        <PostHogProvider>
          <StoreProvider>
            <QueryProvider>
              <ImpersonationProvider
                isImpersonating={imp !== null}
                targetUsername={imp?.targetUsername ?? null}
                targetUserId={imp?.targetUserId ?? null}
              >
                <RouteChangeHandler />
                <HttpInterceptor />
                <SessionExpiredNotifier />
                <AuthModal />
                <PasswordModal />
                {/* Impersonation banner renders above everything — not dismissable */}
                {imp && (
                  <ImpersonationBanner
                    targetUsername={imp.targetUsername}
                    targetUserId={imp.targetUserId}
                    startedAt={imp.startedAt}
                    expiresAt={imp.expiresAt}
                  />
                )}
                <AnnouncementBanner />
                <OnboardingBanner initialObState={obState} />
                {children}
                <div className="sm:bottom-0 sm:left-0 sm:right-0 z-[60]">
                  <FooterWrapper />
                </div>
                <Analytics />
                <SpeedInsights />
              </ImpersonationProvider>
            </QueryProvider>
          </StoreProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
