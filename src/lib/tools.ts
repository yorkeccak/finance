import { z } from "zod";
import { tool } from "ai";
import { Valyu } from "valyu-js";
import { track } from "@vercel/analytics/server";

export const financeTools = {
  // Chart Creation Tool - Create interactive financial charts with time series data
  createChart: tool({
    description: `Create interactive charts for financial data visualization. 
    
    CRITICAL: ALL FIVE FIELDS ARE REQUIRED:
    1. title - Chart title (e.g., "Apple vs Microsoft Stock Performance")
    2. type - Chart type: "line", "bar", or "area" 
    3. xAxisLabel - X-axis label (e.g., "Date", "Quarter")
    4. yAxisLabel - Y-axis label (e.g., "Price ($)", "Revenue")
    5. dataSeries - Array of data series with this exact format:
    
    Example complete tool call:
    {
      "title": "Apple vs Microsoft Stock Performance",
      "type": "line",
      "xAxisLabel": "Date",
      "yAxisLabel": "Closing Price (USD)",
      "dataSeries": [
        {
          "name": "Apple (AAPL)",
          "data": [
            {"x": "2024-01-01", "y": 150.25},
            {"x": "2024-02-01", "y": 155.80}
          ]
        },
        {
          "name": "Microsoft (MSFT)",
          "data": [
            {"x": "2024-01-01", "y": 380.50},
            {"x": "2024-02-01", "y": 385.20}
          ]
        }
      ]
    }
    
    NEVER omit any of the five required fields. Each data point must have x (date/label) and y (numeric value).`,
    inputSchema: z.object({
      title: z
        .string()
        .describe('Chart title (e.g., "Apple vs Microsoft Stock Performance")'),
      type: z
        .enum(["line", "bar", "area"])
        .describe(
          'Chart type - use "line" for time series data like stock prices'
        ),
      xAxisLabel: z
        .string()
        .describe('X-axis label (e.g., "Date", "Quarter", "Year")'),
      yAxisLabel: z
        .string()
        .describe(
          'Y-axis label (e.g., "Price ($)", "Revenue (Millions)", "Percentage (%)")'
        ),
      dataSeries: z
        .array(
          z.object({
            name: z
              .string()
              .describe(
                'Series name - include company/ticker for stocks (e.g., "Apple (AAPL)", "Tesla Revenue")'
              ),
            data: z
              .array(
                z.object({
                  x: z
                    .union([z.string(), z.number()])
                    .describe(
                      'X-axis value - use date strings like "2024-01-01" for time series'
                    ),
                  y: z
                    .number()
                    .describe(
                      "Y-axis numeric value - stock price, revenue, percentage, etc."
                    ),
                })
              )
              .describe(
                "Array of data points with x (date/label) and y (value) properties"
              ),
          })
        )
        .describe(
          "REQUIRED: Array of data series - each series has name and data array with x,y objects"
        ),
      description: z
        .string()
        .optional()
        .describe("Optional description explaining what the chart shows"),
    }),
    execute: async ({
      title,
      type,
      xAxisLabel,
      yAxisLabel,
      dataSeries,
      description,
    }) => {
      // Track chart creation
      await track('Chart Created', {
        chartType: type,
        title: title,
        seriesCount: dataSeries.length,
        totalDataPoints: dataSeries.reduce(
          (sum, series) => sum + series.data.length,
          0
        ),
        hasDescription: !!description
      });

      // Log chart creation details
      console.log("[Chart Creation] Creating chart:", {
        title,
        type,
        xAxisLabel,
        yAxisLabel,
        seriesCount: dataSeries.length,
        totalDataPoints: dataSeries.reduce(
          (sum, series) => sum + series.data.length,
          0
        ),
        seriesNames: dataSeries.map((s) => s.name),
      });

      // Return structured chart data for the UI to render
      const chartData = {
        chartType: type,
        title,
        xAxisLabel,
        yAxisLabel,
        dataSeries,
        description,
        metadata: {
          totalSeries: dataSeries.length,
          totalDataPoints: dataSeries.reduce(
            (sum, series) => sum + series.data.length,
            0
          ),
          dateRange:
            dataSeries.length > 0 && dataSeries[0].data.length > 0
              ? {
                  start: dataSeries[0].data[0].x,
                  end: dataSeries[0].data[dataSeries[0].data.length - 1].x,
                }
              : null,
        },
      };

      console.log(
        "[Chart Creation] Chart data size:",
        JSON.stringify(chartData).length,
        "bytes"
      );

      return chartData;
    },
  }),

  codeExecution: tool({
    description: `Execute Python code securely in a Daytona Sandbox for financial modeling, data analysis, and calculations. CRITICAL: Always include print() statements to show results. Daytona can also capture rich artifacts (e.g., charts) when code renders images.

    REQUIRED FORMAT - Your Python code MUST include print statements:
    
    Example for financial calculations:
    # Calculate compound interest
    principal = 10000
    rate = 0.07
    time = 5
    amount = principal * (1 + rate) ** time
    print(f"Initial investment: $\{principal:,.2f}")
    print(f"Annual interest rate: \{rate*100:.1f}%")
    print(f"Time period: \{time} years")
    print(f"Final amount: $\{amount:,.2f}")
    print(f"Interest earned: $\{amount - principal:,.2f}")
    
    Example for data analysis:
    import math
    values = [100, 150, 200, 175, 225]
    average = sum(values) / len(values)
    std_dev = math.sqrt(sum((x - average) ** 2 for x in values) / len(values))
    print(f"Data: \{values}")
    print(f"Average: \{average:.2f}")
    print(f"Standard deviation: \{std_dev:.2f}")
    
    IMPORTANT: 
    - Always end with print() statements showing final results
    - Use descriptive labels and proper formatting
    - Include units, currency symbols, or percentages where appropriate
    - Show intermediate steps for complex calculations`,
    inputSchema: z.object({
      code: z
        .string()
        .describe(
          "Python code to execute - MUST include print() statements to display results. Use descriptive output formatting with labels, units, and proper number formatting."
        ),
      description: z
        .string()
        .optional()
        .describe(
          'Brief description of what the calculation or analysis does (e.g., "Calculate future value with compound interest", "Analyze portfolio risk metrics")'
        ),
    }),
    execute: async ({ code, description }) => {
      try {
        console.log("[Code Execution] Executing Python code:", {
          description,
          codeLength: code.length,
          codePreview: code.substring(0, 100) + "...",
        });

        // Route through our Daytona-backed Python execution API
        const response = await fetch(
          `${
            process.env.NEXT_PUBLIC_APP_URL ||
            (typeof window === "undefined" ? "" : window.location.origin) ||
            "http://localhost:3000"
          }/api/python`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code, description }),
          }
        );

        const result = await response.json();

        // Track code execution
        await track('Python Code Executed', {
          success: result.success,
          codeLength: code.length,
          outputLength: result.output?.length || 0,
          executionTime: result.executionTime || null,
          hasDescription: !!description,
          hasError: !!result.error,
          hasArtifacts: !!result.artifacts
        });

        console.log("[Code Execution] Result:", {
          success: result.success,
          outputLength: result.output?.length || 0,
          executionTime: result.executionTime,
          error: result.error,
        });

        if (!response.ok) {
          return `❌ **API Error**: ${
            result.error || "Failed to execute Python code"
          }`;
        }

        if (!result.success) {
          return result.error || "❌ **Execution failed**";
        }

        // Format the successful execution result
        const artifactsNote = result.artifacts
          ? "\n\n🖼️ Artifacts captured by Daytona (e.g., charts) are available."
          : "";
        return `🐍 **Python Code Execution (Daytona Sandbox)**
${description ? `**Description**: ${description}\n` : ""}

\`\`\`python
${result.executedCode || code}
\`\`\`

**Output:**
\`\`\`
${result.output || "(No output produced)"}
\`\`\`

⏱️ **Execution Time**: ${result.executionTime}ms`;
      } catch (error) {
        return `❌ **Network Error**: Failed to connect to Python execution service. ${
          error instanceof Error ? error.message : "Unknown error occurred"
        }`;
      }
    },
  }),

  financialSearch: tool({
    description:
      "Search for comprehensive financial data including real-time market data, earnings reports, SEC filings, regulatory updates, and financial news using Valyu DeepSearch API",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          'Financial search query (e.g., "Apple latest quarterly earnings", "Bitcoin price trends", "Tesla SEC filings")'
        ),
      dataType: z
        .enum([
          "auto",
          "market_data",
          "earnings",
          "sec_filings",
          "news",
          "regulatory",
        ])
        .optional()
        .describe("Type of financial data to focus on"),
      maxResults: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .default(10)
        .describe(
          "Maximum number of results to return. This is not number of daya/hours of stock data, for example 1 yr of stock data for 1 company is 1 result"
        ),
    }),
    execute: async ({ query, dataType, maxResults }) => {
      try {
        // Check if Valyu API key is available
        const apiKey = process.env.VALYU_API_KEY;
        if (!apiKey) {
          return "❌ Valyu API key not configured. Please add VALYU_API_KEY to your environment variables to enable financial search.";
        }
        const valyu = new Valyu(apiKey, "https://api.valyu.network/v1");

        // Configure search based on data type
        let searchOptions: any = {
          max_num_results: maxResults || 10,
        };

        // Add specific data sources based on requested data type
        switch (dataType) {
          case "market_data":
            searchOptions.included_sources = [
              "valyu/valyu-stocks-US",
              "valyu/valyu-crypto",
              "valyu/valyu-forex",
              "valyu/valyu-market-movers-US",
            ];
            break;
          case "earnings":
            searchOptions.included_sources = [
              "valyu/valyu-earnings-US",
              "valyu/valyu-statistics-US",
            ];
            break;
          case "sec_filings":
            searchOptions.included_sources = ["valyu/valyu-sec-filings"];
            break;
          case "news":
            searchOptions.included_sources = [
              "wiley/wiley-finance-books", // Paywalled textbooks and journals from Wiley
              "wiley/wiley-finance-papers",
              "bloomberg.com",
              "reuters.com",
              "wsj.com",
              "marketwatch.com",
              "ft.com",
              "cnbc.com",
              "investopedia.com",
              "seekingalpha.com",
              "morningstar.com",
              "fool.com",
              "barrons.com",
              "yahoo.com",
              "forbes.com",
              "businessinsider.com",
              "economist.com",
              "markets.businessinsider.com",
              "nasdaq.com",
              "fidelity.com",
              "zacks.com",
              "tradingview.com",
            ];
            break;
          case "regulatory":
            searchOptions.included_sources = [
              "sec.gov",
              "federalreserve.gov",
              "treasury.gov",
            ];
            break;
          // 'auto' - let Valyu automatically select the best sources
        }

        const response = await valyu.search(query, searchOptions);

        // Track Valyu financial search call
        await track('Valyu API Call', {
          toolType: 'financialSearch',
          query: query,
          dataType: dataType || 'auto',
          maxResults: maxResults || 10,
          resultCount: response?.results?.length || 0,
          hasApiKey: !!apiKey,
          cost: (response as any)?.price || null,
          txId: (response as any)?.tx_id || null
        });

        // Log the full API response for debugging
        console.log(
          "[Financial Search] Full API Response:",
          JSON.stringify(response, null, 2)
        );

        if (!response || !response.results || response.results.length === 0) {
          return `🔍 No financial data found for "${query}". Try rephrasing your search or checking if the company/symbol exists.`;
        }

        // Log key information about the search
        console.log("[Financial Search] Summary:", {
          query,
          dataType,
          resultCount: response.results.length,
          totalCost: (response as any).price || "N/A",
          txId: (response as any).tx_id || "N/A",
          firstResultTitle: response.results[0]?.title,
          firstResultLength: response.results[0]?.length,
        });

        // Return structured data for the model to process
        const formattedResponse = {
          type: "financial_search",
          query: query,
          dataType: dataType,
          resultCount: response.results.length,
          results: response.results.map((result: any) => ({
            title: result.title || "Financial Data",
            url: result.url,
            content: result.content,
            date: result.metadata?.date,
            source: result.metadata?.source,
            dataType: result.data_type,
            length: result.length,
            image_url: result.image_url || {},
            relevance_score: result.relevance_score,
          })),
        };

        console.log(
          "[Financial Search] Formatted response size:",
          JSON.stringify(formattedResponse).length,
          "bytes"
        );

        return JSON.stringify(formattedResponse, null, 2);
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message.includes("401") ||
            error.message.includes("unauthorized")
          ) {
            return "🔐 Invalid Valyu API key. Please check your VALYU_API_KEY environment variable.";
          }
          if (error.message.includes("429")) {
            return "⏱️ Rate limit exceeded. Please try again in a moment.";
          }
          if (
            error.message.includes("network") ||
            error.message.includes("fetch")
          ) {
            return "🌐 Network error connecting to Valyu API. Please check your internet connection.";
          }
        }

        return `❌ Error searching financial data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
      }
    },
  }),

  webSearch: tool({
    description:
      "Search the web for general information on any topic using Valyu DeepSearch API with access to both proprietary sources and web content",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          'Search query for any topic (e.g., "benefits of renewable energy", "latest AI developments", "climate change solutions")'
        ),
      maxResults: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .default(5)
        .describe("Maximum number of results to return"),
    }),
    execute: async ({ query, maxResults }) => {
      try {
        // Initialize Valyu client (uses default/free tier if no API key)
        const valyu = new Valyu(
          process.env.VALYU_API_KEY,
          "https://api.valyu.network/v1"
        );

        // Configure search options
        const searchOptions = {
          searchType: "all" as const, // Search both proprietary and web sources
          maxNumResults: maxResults || 5,
          isToolCall: true, // true for AI agents/tools
        };

        const response = await valyu.search(query, searchOptions);

        // Track Valyu web search call
        await track('Valyu API Call', {
          toolType: 'webSearch',
          query: query,
          maxResults: maxResults || 5,
          resultCount: response?.results?.length || 0,
          hasApiKey: !!process.env.VALYU_API_KEY,
          cost: (response as any)?.metadata?.totalCost || (response as any)?.price || null,
          searchTime: (response as any)?.metadata?.searchTime || null,
          txId: (response as any)?.tx_id || null
        });

        // Log the full API response for debugging
        console.log(
          "[Web Search] Full API Response:",
          JSON.stringify(response, null, 2)
        );

        if (!response || !response.results || response.results.length === 0) {
          return `🔍 No web results found for "${query}". Try rephrasing your search with different keywords.`;
        }

        // Log key information about the search
        const metadata = (response as any).metadata;
        console.log("[Web Search] Summary:", {
          query,
          resultCount: response.results.length,
          totalCost: metadata?.totalCost || (response as any).price || "N/A",
          searchTime: metadata?.searchTime || "N/A",
          txId: (response as any).tx_id || "N/A",
          firstResultTitle: response.results[0]?.title,
          firstResultLength: response.results[0]?.length,
        });

        // Return structured data for the model to process
        const formattedResponse = {
          type: "web_search",
          query: query,
          resultCount: response.results.length,
          metadata: {
            totalCost: metadata?.totalCost,
            searchTime: metadata?.searchTime,
          },
          results: response.results.map((result: any) => ({
            title: result.title || "Web Result",
            url: result.url,
            content: result.content,
            date: result.metadata?.date,
            source: result.metadata?.source,
            dataType: result.data_type,
            length: result.length,
            image_url: result.image_url || {},
            relevance_score: result.relevance_score,
          })),
        };

        console.log(
          "[Web Search] Formatted response size:",
          JSON.stringify(formattedResponse).length,
          "bytes"
        );

        return JSON.stringify(formattedResponse, null, 2);
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message.includes("401") ||
            error.message.includes("unauthorized")
          ) {
            return "🔐 Authentication error with Valyu API. Please check your configuration.";
          }
          if (error.message.includes("429")) {
            return "⏱️ Rate limit exceeded. Please try again in a moment.";
          }
          if (
            error.message.includes("network") ||
            error.message.includes("fetch")
          ) {
            return "🌐 Network error connecting to Valyu API. Please check your internet connection.";
          }
          if (
            error.message.includes("price") ||
            error.message.includes("cost")
          ) {
            return "💰 Search cost exceeded maximum budget. Try reducing maxPrice or using more specific queries.";
          }
        }

        return `❌ Error performing web search: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
      }
    },
  }),
};
