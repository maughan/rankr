import StoreProvider from "./storeProvider";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";
import Head from "./head";
import Link from "next/link";

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased mt-2`}
      >
        <Toaster position="top-right" expand richColors />
        <StoreProvider>{children}</StoreProvider>
        <Link
          href="/"
          className="px-4 py-2 pt-6 font-bold text-3xl absolute top-0 left-0"
        >
          Rankr
        </Link>
      </body>
    </html>
  );
}
