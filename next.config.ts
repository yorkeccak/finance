import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Financial news and data sources
      {
        protocol: 'https',
        hostname: 'bloomberg.com',
      },
      {
        protocol: 'https',
        hostname: '**.bloomberg.com',
      },
      {
        protocol: 'https',
        hostname: 'reuters.com',
      },
      {
        protocol: 'https',
        hostname: '**.reuters.com',
      },
      {
        protocol: 'https',
        hostname: 'wsj.com',
      },
      {
        protocol: 'https',
        hostname: '**.wsj.com',
      },
      {
        protocol: 'https',
        hostname: 'marketwatch.com',
      },
      {
        protocol: 'https',
        hostname: '**.marketwatch.com',
      },
      {
        protocol: 'https',
        hostname: 'ft.com',
      },
      {
        protocol: 'https',
        hostname: '**.ft.com',
      },
      {
        protocol: 'https',
        hostname: 'cnbc.com',
      },
      {
        protocol: 'https',
        hostname: '**.cnbc.com',
      },
      {
        protocol: 'https',
        hostname: 'investopedia.com',
      },
      {
        protocol: 'https',
        hostname: '**.investopedia.com',
      },
      {
        protocol: 'https',
        hostname: 'seekingalpha.com',
      },
      {
        protocol: 'https',
        hostname: '**.seekingalpha.com',
      },
      {
        protocol: 'https',
        hostname: 'morningstar.com',
      },
      {
        protocol: 'https',
        hostname: '**.morningstar.com',
      },
      {
        protocol: 'https',
        hostname: 'fool.com',
      },
      {
        protocol: 'https',
        hostname: '**.fool.com',
      },
      {
        protocol: 'https',
        hostname: 'barrons.com',
      },
      {
        protocol: 'https',
        hostname: '**.barrons.com',
      },
      {
        protocol: 'https',
        hostname: 'yahoo.com',
      },
      {
        protocol: 'https',
        hostname: '**.yahoo.com',
      },
      {
        protocol: 'https',
        hostname: 'forbes.com',
      },
      {
        protocol: 'https',
        hostname: '**.forbes.com',
      },
      {
        protocol: 'https',
        hostname: 'businessinsider.com',
      },
      {
        protocol: 'https',
        hostname: '**.businessinsider.com',
      },
      {
        protocol: 'https',
        hostname: 'economist.com',
      },
      {
        protocol: 'https',
        hostname: '**.economist.com',
      },
      {
        protocol: 'https',
        hostname: 'nasdaq.com',
      },
      {
        protocol: 'https',
        hostname: '**.nasdaq.com',
      },
      {
        protocol: 'https',
        hostname: 'fidelity.com',
      },
      {
        protocol: 'https',
        hostname: '**.fidelity.com',
      },
      {
        protocol: 'https',
        hostname: 'zacks.com',
      },
      {
        protocol: 'https',
        hostname: '**.zacks.com',
      },
      {
        protocol: 'https',
        hostname: 'tradingview.com',
      },
      {
        protocol: 'https',
        hostname: '**.tradingview.com',
      },
      {
        protocol: 'https',
        hostname: 'sec.gov',
      },
      {
        protocol: 'https',
        hostname: '**.sec.gov',
      },
      {
        protocol: 'https',
        hostname: 'federalreserve.gov',
      },
      {
        protocol: 'https',
        hostname: '**.federalreserve.gov',
      },
      {
        protocol: 'https',
        hostname: 'treasury.gov',
      },
      {
        protocol: 'https',
        hostname: '**.treasury.gov',
      },
      // Common CDN and image hosting services
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: '**.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '**.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: '**.valyu.network',
      },
      {
        protocol: 'https',
        hostname: 'valyu.network',
      },
      // Generic fallback for other domains that might be needed
      {
        protocol: 'https',
        hostname: '**.com',
      },
      {
        protocol: 'https',
        hostname: '**.net',
      },
      {
        protocol: 'https',
        hostname: '**.org',
      },
      {
        protocol: 'https',
        hostname: '**.io',
      },
    ],
  },
};

export default nextConfig;
