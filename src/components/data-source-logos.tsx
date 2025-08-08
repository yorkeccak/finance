"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CodeSnippetDialog from "./code-snippet-dialog";

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
    console.log(\`Title: \${result.title}\`);
    console.log(\`Content: \${result.content.substring(0, 200)}...\`);
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.network/v1/deepsearch \\
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
    console.log(\`Title: \${paper.title}\`);
    console.log(\`Authors: \${paper.metadata?.authors || []}\`);
    console.log(\`Abstract: \${paper.content.substring(0, 300)}...\`);
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.network/v1/deepsearch \\
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
    console.log(\`Company: \${statement.metadata?.company}\`);
    console.log(\`Period: \${statement.metadata?.period}\`);
    console.log(\`Data: \${statement.content}\`);
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.network/v1/deepsearch \\
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
    console.log(\`Symbol: \${item.metadata?.symbol}\`);
    console.log(\`Price: $\${item.metadata?.price}\`);
    console.log(\`Analysis: \${item.content}\`);
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.network/v1/deepsearch \\
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
    console.log(\`Title: \${result.title}\`);
    console.log(\`URL: \${result.metadata?.url}\`);
    console.log(\`Relevance: \${result.metadata?.relevance_score}\`);
    console.log(\`Content: \${result.content.substring(0, 200)}...\`);
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.network/v1/deepsearch \\
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
    console.log(\`Title: \${paper.title}\`);
    console.log(\`Journal: \${paper.metadata?.journal}\`);
    console.log(\`DOI: \${paper.metadata?.doi}\`);
    console.log(\`Abstract: \${paper.content.substring(0, 300)}...\`);
});`,
      },
      {
        language: "cURL",
        code: `curl -X POST https://api.valyu.network/v1/deepsearch \\
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
  const [selectedLogo, setSelectedLogo] = useState<any>(null);
  const [hoveredLogo, setHoveredLogo] = useState<string | null>(null);
  const [animatedLogo, setAnimatedLogo] = useState<number>(0);
  
  // Keep the exact same logos as before
  const displayLogos = [
    { name: "SEC Filings", src: "/sec.svg", sizeClass: "h-6 sm:h-7" },
    { name: "arXiv Papers", src: "/arxiv.svg", sizeClass: "h-5 sm:h-6" },
    { name: "Financial Statements", src: "/balancesheet.svg", sizeClass: "h-5 sm:h-6" },
    { name: "Market Data", src: "/stocks.svg", sizeClass: "h-7 sm:h-9" },
    { name: "Web Search", src: "/web.svg", sizeClass: "h-6 sm:h-7" },
    { name: "Wiley", src: "/wy.svg", sizeClass: "h-4 sm:h-4" },
  ];

  // Cycling animation effect - pauses when user is hovering
  useEffect(() => {
    // Don't run animation if user is hovering over any logo
    if (hoveredLogo) return;
    
    const interval = setInterval(() => {
      setAnimatedLogo((prev) => (prev + 1) % displayLogos.length);
    }, 2000); // Change every 2 seconds

    return () => clearInterval(interval);
  }, [displayLogos.length, hoveredLogo]);

  return (
    <>
      <motion.div
        className="flex justify-center items-center space-x-6 sm:space-x-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5, ease: "easeOut" }}
      >
        {displayLogos.map((displayLogo, index) => {
          const logoData = logos.find(l => l.name === displayLogo.name);
          const isHovered = hoveredLogo === displayLogo.name;
          const isAnimated = animatedLogo === index;
          const shouldShowColor = isHovered || isAnimated;
          
          return (
            <div
              key={displayLogo.name}
              className="relative"
              onMouseEnter={() => setHoveredLogo(displayLogo.name)}
              onMouseLeave={() => setHoveredLogo(null)}
            >
              <motion.img
                src={displayLogo.src}
                alt={displayLogo.name}
                className={`cursor-pointer transition-all duration-500 ${displayLogo.sizeClass}`}
                style={{
                  filter: shouldShowColor ? 'none' : 'grayscale(100%) opacity(0.4)',
                  opacity: shouldShowColor ? 1 : 0.4
                }}
                animate={{
                  scale: isAnimated ? 1.1 : 1,
                }}
                transition={{
                  duration: 0.3,
                  ease: "easeOut"
                }}
                onClick={() => logoData && setSelectedLogo(logoData)}
              />
            </div>
          );
        })}
      </motion.div>

      {selectedLogo && (
        <CodeSnippetDialog
          isOpen={!!selectedLogo}
          onClose={() => setSelectedLogo(null)}
          title={selectedLogo.name}
          snippets={selectedLogo.snippets}
        />
      )}
    </>
  );
};

export default DataSourceLogos;