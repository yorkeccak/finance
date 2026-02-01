import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MissingKeysDialog } from "@/components/missing-keys-dialog";
import { OllamaProvider } from "@/lib/ollama-context";
import { Analytics } from '@vercel/analytics/next';
import { AuthInitializer } from "@/components/auth/auth-initializer";
import { QueryProvider } from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider } from "@/components/posthog-provider";
import { logEnvironmentStatus } from "@/lib/env-validation";
import { LocalModelStatus } from "@/components/local-model-status";
import { MigrationBanner } from "@/components/migration-banner";
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
    process.env.NEXT_PUBLIC_APP_URL || "https://finance.valyu.ai"
  ),
  title: {
    default: "Finance AI Agent - Deep Research & Analysis | Valyu",
    template: "%s | Finance AI Agent | Valyu",
  },
  description:
    "AI-powered financial research agent with real-time market data, SEC filings, and institutional-grade analysis. Deep research for stocks, companies, and markets through natural language.",
  keywords: [
    "AI finance",
    "finance AI agent",
    "financial research AI",
    "deepresearch finance",
    "AI stock research",
    "financial data API",
    "SEC filings search",
    "market analysis AI",
    "investment research",
    "Bloomberg alternative",
  ],
  applicationName: "Finance by Valyu",
  authors: [{ name: "Valyu", url: "https://valyu.ai" }],
  creator: "Valyu",
  publisher: "Valyu",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Finance AI Agent - Deep Research & Analysis | Valyu",
    description:
      "AI-powered financial research with real-time market data, SEC filings, and institutional-grade analysis. Natural language queries for stocks, companies, and markets.",
    url: "/",
    siteName: "Finance by Valyu",
    images: [
      {
        url: "/valyu.png",
        width: 1200,
        height: 630,
        alt: "Finance AI Agent - Deep Financial Research",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finance AI Agent - Deep Research | Valyu",
    description:
      "AI-powered financial research agent. Real-time market data, SEC filings, and institutional-grade analysis through natural language.",
    images: ["/valyu.png"],
    creator: "@valaborator",
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/valyu.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/valyu.png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.json",
  category: "finance",
  classification: "Finance, Investment, Research",
  other: {
    "google-site-verification": process.env.GOOGLE_SITE_VERIFICATION || "",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Finance by Valyu",
  description:
    "AI-powered financial research agent with real-time market data, SEC filings, and institutional-grade analysis through natural language.",
  url: "https://finance.valyu.ai",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Organization",
    name: "Valyu",
    url: "https://valyu.ai",
  },
  featureList: [
    "Real-time market data from 50+ global exchanges",
    "SEC filings search and analysis",
    "AI-powered financial research",
    "Python code execution in secure sandboxes",
    "Interactive charts and visualizations",
    "Natural language queries",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Log environment status on server-side render
  if (typeof window === 'undefined') {
    logEnvironmentStatus();
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthInitializer>
              <PostHogProvider>
                <OllamaProvider>
                  <MissingKeysDialog />
                  <LocalModelStatus />
                  <MigrationBanner />
                  {children}
                  <Analytics />
                </OllamaProvider>
              </PostHogProvider>
            </AuthInitializer>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}