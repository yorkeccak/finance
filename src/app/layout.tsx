import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MissingKeysDialog } from "@/components/missing-keys-dialog";
import { Analytics } from '@vercel/analytics/next';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  title: {
    default: "Finance by Valyu",
    template: "%s | Finance by Valyu",
  },
  description:
    "AI-powered financial analysis by Valyu. Real-time data, secure Python execution in Daytona sandboxes, and interactive visualizations for research and reporting.",
  applicationName: "Finance by Valyu",
  openGraph: {
    title: "Finance by Valyu",
    description:
      "AI-powered financial analysis by Valyu. Real-time data, secure Python execution in Daytona sandboxes, and interactive visualizations for research and reporting.",
    url: "/",
    siteName: "Finance by Valyu",
    images: [
      {
        url: "/valyu.png",
        width: 1200,
        height: 630,
        alt: "Finance by Valyu",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finance by Valyu",
    description:
      "AI-powered financial analysis by Valyu. Real-time data, secure Python execution in Daytona sandboxes, and interactive visualizations for research and reporting.",
    images: ["/valyu.png"],
  },
  icons: {
    icon: "/favicon.ico",
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
        <MissingKeysDialog />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
