import StoreProvider from "./storeProvider";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";
import Head from "./head";
import RouteChangeHandler from "./RouteChangeHandler";
import AuthModal from "./components/authModal";
import PasswordModal from "./components/passwordModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Head />
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
        </StoreProvider>
      </body>
    </html>
  );
}
