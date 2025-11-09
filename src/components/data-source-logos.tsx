"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import { useTheme } from "next-themes";
import Image from "next/image";

const logos = [
  {
    name: "SEC Filings",
    src: "/sec.svg",
    description: "Access SEC EDGAR filings",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search for specific SEC filings
response = valyu.search(
    "Pfizer 10-K filing from 2023",
    included_sources=["valyu/valyu-sec-filings"]
    # or leave included_sources empty and we'll figure it out for you
)

# Access the results
for result in response.results:
    print(f"Title: {result.title}")
    print(f"Content: {result.content[:200]}...")`,
      },
      {     
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search for specific SEC filings
const response = await valyu.search({
    query: 'Pfizer 10-K filing from 2023',
    includedSources: ['valyu/valyu-sec-filings'],
    // or leave included_sources empty and we'll figure it out for you
});

// Access the results
response.results.forEach(result => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "Pfizer 10-K filing from 2023",
    "included_sources": ["valyu/valyu-sec-filings"] # or leave this empty and we'll figure it out for you
  }'`,
      },
    ],
  },
  {
    name: "arXiv Papers",
    src: "/arxiv.svg",
    description: "Search academic papers from arXiv",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search for academic papers
response = valyu.search(
    "transformer architecture attention mechanism",
    included_sources=["valyu/valyu-arxiv"] # or leave this empty and we'll figure it out for you
)

# Get paper details
for paper in response.results:
    print(f"Title: {paper.title}")
    print(f"Authors: {paper.metadata.get('authors', [])}")
    print(f"Abstract: {paper.content[:300]}...")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search for academic papers
const response = await valyu.search({
    query: 'transformer architecture attention mechanism',
    includedSources: ['valyu/valyu-arxiv'], // or leave this empty and we'll figure it out for you
});

// Get paper details
response.results.forEach(paper => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "transformer architecture attention mechanism",
    "included_sources": ["valyu/valyu-arxiv"] # or leave this empty and we'll figure it out for you
  }'`,
      },
    ],
  },
  {
    name: "Financial Statements",
    src: "/balancesheet.svg",
    description: "Financial statements & company data",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search for financial statements
response = valyu.search(
    "Apple balance sheet Q1 2025",
    included_sources=[
        "valyu/valyu-earnings-US",
        "valyu/valyu-statistics-US",
        "valyu/valyu-income-statement-US",
        "valyu/valyu-balance-sheet-US",
        "valyu/valyu-cash-flow-US",
        "valyu/valyu-sec-filings",
        "valyu/valyu-dividends-US"
    ] # or leave this empty and we'll figure it out for you
)

# Extract financial data
for statement in response.results:
    print(f"Company: {statement.metadata.get('company')}")
    print(f"Period: {statement.metadata.get('period')}")
    print(f"Data: {statement.content}")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search for financial statements
const response = await valyu.search({
    query: 'Apple balance sheet Q1 2025',
    includedSources: [
        "valyu/valyu-earnings-US",
        "valyu/valyu-statistics-US",
        "valyu/valyu-income-statement-US",
        "valyu/valyu-balance-sheet-US",
        "valyu/valyu-cash-flow-US",
        "valyu/valyu-sec-filings",
        "valyu/valyu-dividends-US"
    ], // or leave this empty and we'll figure it out for you
});

// Extract financial data
response.results.forEach(statement => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "Apple balance sheet Q1 2025",
    "included_sources": [
        "valyu/valyu-earnings-US",
        "valyu/valyu-statistics-US",
        "valyu/valyu-income-statement-US",
        "valyu/valyu-balance-sheet-US",
        "valyu/valyu-cash-flow-US",
        "valyu/valyu-sec-filings",
        "valyu/valyu-dividends-US"
    ] # or leave this empty and we'll figure it out for you
  }'`,
      },
    ],
  },
  {
    name: "Market Data",
    src: "/stocks.svg",
    description: "Real-time stock, crypto, forex, and market data",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search for stock market data
response = valyu.search(
    "AAPL stock price technical analysis",
    included_sources=[
        'valyu/valyu-stocks-US',
        'valyu/valyu-crypto',
        'valyu/valyu-forex',
        'valyu/valyu-market-movers-US'
    ] # or leave this empty and we'll figure it out for you
)

# Get market insights
for item in response.results:
    print(f"Symbol: {item.metadata.get('symbol')}")
    print(f"Price: {item.metadata.get('price')}")
    print(f"Analysis: {item.content}")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search for stock market data
const response = await valyu.search({
    query: 'AAPL stock price technical analysis',
    includedSources: [
        'valyu/valyu-stocks-US',
        'valyu/valyu-crypto',
        'valyu/valyu-forex',
        'valyu/valyu-market-movers-US'
    ], // or leave this empty and we'll figure it out for you
});

// Get market insights
response.results.forEach(item => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "AAPL stock price technical analysis",
    "included_sources": [
        "valyu/valyu-stocks-US",
        "valyu/valyu-crypto",
        "valyu/valyu-forex",
        "valyu/valyu-market-movers-US"
    ] # or leave this empty and we'll figure it out for you
  }'`,
      },
    ],
  },
  {
    name: "Web Search",
    src: "/web.svg",
    description: "General web search with relevance scoring",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search across the web
response = valyu.search(
    "renewable energy investment trends 2024"
)

# Get ranked results
for result in response.results:
    print(f"Title: {result.title}")
    print(f"URL: {result.metadata.get('url')}")
    print(f"Relevance: {result.metadata.get('relevance_score')}")
    print(f"Content: {result.content[:200]}...")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search across the web
const response = await valyu.search({
    query: 'renewable energy investment trends 2024'
});

// Get ranked results
response.results.forEach(result => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "renewable energy investment trends 2024"
  }'`,
      },
    ],
  },
  {
    name: "Wiley",
    src: "/wy.svg",
    description: "Academic research from Wiley publications",
    snippets: [
      {
        language: "Python",
        code: `from valyu import Valyu

valyu = Valyu(api_key="<your_api_key>")

# Search Wiley research publications
response = valyu.search(
    "machine learning finance applications",
    included_sources=[
        "valyu/wiley-finance-books", 
        "valyu/wiley-finance-papers"
    ] # or leave this empty and we'll pick the best sources for you
)

# Access research papers
for paper in response.results:
    print(f"Title: {paper.title}")
    print(f"Journal: {paper.metadata.get('journal')}")
    print(f"DOI: {paper.metadata.get('doi')}")
    print(f"Abstract: {paper.content[:300]}...")`,
      },
      {
        language: "TypeScript",
        code: `import { Valyu } from 'valyu';

const valyu = new Valyu({ apiKey: '<your_api_key>' });

// Search Wiley research publications
const response = await valyu.search({
    query: 'machine learning finance applications',
    includedSources: [
        "valyu/wiley-finance-books",
        "valyu/wiley-finance-papers"
    ], // or leave this empty and we'll pick the best sources for you
});

// Access research papers
response.results.forEach(paper => {
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.ai/v1/deepsearch \\
  -H "x-api-key: <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "machine learning finance applications",
    "included_sources": [
        "valyu/wiley-finance-books",
        "valyu/wiley-finance-papers"
    ] # or leave this empty and we'll pick the best sources for you
  }'`,
      },
    ],
  },
];

const DataSourceLogos = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const controls = useAnimation();
  const animationRef = useRef<any>(null);

  // All logos from assets/banner
  const allLogos = [
    { name: "Reddit", src: "/assets/banner/reddit.png" },
    { name: "SEC", src: "/assets/banner/sec.png" },
    { name: "Wikipedia", src: "/assets/banner/wikipedia.png" },
    { name: "Medium", src: "/assets/banner/medium.png" },
    { name: "arXiv", src: "/assets/banner/arxiv.png" },
    { name: "PubMed", src: "/assets/banner/pubmed.png" },
    { name: "GitHub", src: "/assets/banner/github.png" },
    { name: "Kalshi", src: "/assets/banner/kalshi.png" },
    { name: "Crunchbase", src: "/assets/banner/crunchbase.png" },
    { name: "PitchBook", src: "/assets/banner/pitchbook.png" },
    { name: "LinkedIn", src: "/assets/banner/linkedin.png" },
    { name: "FRED", src: "/assets/banner/fred.png" },
    { name: "BLS", src: "/assets/banner/bls.png" },
    { name: "USPTO", src: "/assets/banner/uspto.png" },
    // { name: "Wiley", src: "/assets/banner/wiley.png" },
    { name: "ClinicalTrials", src: "/assets/banner/clinicaltrials.png" },
    { name: "Polymarket", src: "/assets/banner/polymarket.png" },
  ];

  // Duplicate logos for seamless infinite scroll
  const duplicatedLogos = [...allLogos, ...allLogos, ...allLogos];

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Start continuous animation
  useEffect(() => {
    const animate = async () => {
      await controls.start({
        x: [0, -100 * allLogos.length],
        transition: {
          // ↓↓↓ Decrease duration by 1.5x for 1.5x speed ↑↑↑
          duration: (allLogos.length * 3) / 1.5,
          ease: "linear",
          repeat: Infinity,
        }
      });
    };

    animate();
  }, [controls, allLogos.length]);

  const handleMouseEnter = (index: number) => {
    setHoveredIndex(index);
    controls.stop();
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    // Resume from current position at 1.5x speed
    controls.start({
      x: -100 * allLogos.length,
      transition: {
        duration: (allLogos.length * 3) / 1.5,
        ease: "linear",
        repeat: Infinity,
      }
    });
  };

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <div className="relative w-full overflow-hidden py-4">
      <motion.div
        className="flex gap-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <motion.div
          className="flex gap-12 flex-shrink-0"
          animate={controls}
        >
          {duplicatedLogos.map((logo, index) => {
            const isHovered = hoveredIndex === index;

            return (
              <motion.div
                key={`${logo.name}-${index}`}
                className="relative flex-shrink-0"
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
                animate={{
                  scale: isHovered ? 1.3 : 1,
                }}
                transition={{
                  scale: { duration: 0.3 }
                }}
              >
                <div className="relative w-16 h-16">
                  <Image
                    src={logo.src}
                    alt={logo.name}
                    fill
                    className="object-contain transition-all duration-500"
                    style={{
                      filter: isHovered
                        ? 'grayscale(0%)'
                        : isDark
                          ? 'grayscale(100%) opacity(0.3) brightness(2)'
                          : 'grayscale(100%) opacity(0.3)',
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      {/* Gradient edges for infinite scroll effect */}
      <div className="absolute top-0 left-0 h-full w-32 bg-gradient-to-r from-[#F5F5F5] dark:from-gray-950 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 h-full w-32 bg-gradient-to-l from-[#F5F5F5] dark:from-gray-950 to-transparent pointer-events-none" />
    </div>
  );
};

export default DataSourceLogos;