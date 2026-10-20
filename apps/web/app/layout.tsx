import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { googleAuthEnabled } from "@/lib/auth";
import { env } from "@/lib/env";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

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
  metadataBase: new URL(env.AUTH_URL),
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
      data-theme="system"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script id="theme-boot" strategy="beforeInteractive">
          {THEME_BOOT_SCRIPT}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <AuthDialogProvider googleEnabled={googleAuthEnabled}>{children}</AuthDialogProvider>
        </TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
