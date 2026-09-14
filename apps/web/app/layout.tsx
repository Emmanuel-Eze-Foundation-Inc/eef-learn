import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { googleAuthEnabled } from "@/lib/auth";

import { AuthDialogProvider } from "./components/auth-dialog";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EEF Learn",
  description:
    "Learn anything. See the whole map. Community-led learning maps by the Emmanuel Eze Foundation.",
  icons: {
    icon: [{ url: "/brand/learn-favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: "/brand/learn-apple-touch-180.png",
  },
  openGraph: {
    title: "EEF Learn",
    description:
      "Learn anything. See the whole map. Community-led learning maps by the Emmanuel Eze Foundation.",
    images: [{ url: "/brand/learn-og-1200x630.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EEF Learn",
    description:
      "Learn anything. See the whole map. Community-led learning maps by the Emmanuel Eze Foundation.",
    images: ["/brand/learn-og-1200x630.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthDialogProvider googleEnabled={googleAuthEnabled}>{children}</AuthDialogProvider>
      </body>
    </html>
  );
}
