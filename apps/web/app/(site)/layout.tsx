import type { Metadata } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Emmanuel Eze Foundation",
  description:
    "From 100 children in Makoko to eight free bootcamps to EEF Learn: free learning maps for every age, from the Emmanuel Eze Foundation.",
  icons: {
    icon: [{ url: "/brand/eef-favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: "/brand/eef-apple-touch-180.png",
  },
  openGraph: {
    title: "Emmanuel Eze Foundation",
    description:
      "From 100 children in Makoko to eight free bootcamps to EEF Learn: free learning maps for every age, from the Emmanuel Eze Foundation.",
    images: [{ url: "/brand/eef-og-1200x630.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Emmanuel Eze Foundation",
    images: ["/brand/eef-og-1200x630.png"],
  },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-foundation=""
      className={`${outfit.variable} ${jetbrains.variable} ${outfit.className} flex min-h-dvh w-full min-w-0 flex-1 flex-col overflow-x-clip bg-night-950 text-star-100`}
    >
      {children}
    </div>
  );
}
