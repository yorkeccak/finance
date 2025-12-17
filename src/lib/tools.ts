import { z } from "zod";
import { tool } from "ai";
import { Valyu } from "valyu-js";
import { track } from "@vercel/analytics/server";
import { Daytona } from '@daytonaio/sdk';
import { createClient } from '@/utils/supabase/server';
import * as db from '@/lib/db';
import { randomUUID } from 'crypto';

// Valyu OAuth Proxy URL (for user credit billing)
const VALYU_OAUTH_PROXY_URL = process.env.VALYU_OAUTH_PROXY_URL ||
  `${process.env.VALYU_APP_URL || process.env.NEXT_PUBLIC_VALYU_APP_URL || 'https://platform.valyu.ai'}/api/oauth/proxy`;

/**
 * Call Valyu DeepSearch API via OAuth proxy (user credits) or direct (server API key)
 *
 * DeepSearch is the primary search endpoint that handles credit billing.
 * All searches go through /v1/deepsearch for comprehensive financial data retrieval.
 */
async function callValyuApi(
  path: string,
  body: any,
  valyuAccessToken?: string
): Promise<any> {
  if (valyuAccessToken) {
    // Use OAuth proxy - charges to user's org credits
    console.log('[callValyuApi] Using OAuth proxy for user credit billing, path:', path);
    const response = await fetch(VALYU_OAUTH_PROXY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${valyuAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path, method: 'POST', body }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'proxy_failed' }));
      throw new Error(error.error_description || error.error || 'Valyu proxy request failed');
    }

    return response.json();
  } else {
    // Fallback to server API key (dev mode only)
    console.log('[callValyuApi] Using server API key (fallback/dev mode)');
    const apiKey = process.env.VALYU_API_KEY;
    if (!apiKey) {
      throw new Error('No Valyu API key available');
    }
    const valyu = new Valyu(apiKey, 'https://api.valyu.ai/v1');

    // The Valyu SDK's search() method calls /deepsearch endpoint internally
    // Parse the path to determine the method
    if (path === '/v1/deepsearch') {
      return valyu.search(body.query, body);
    }

    throw new Error(`Unknown Valyu API path: ${path}`);
  }
}


export const financeTools = {
  // Chart Creation Tool - Create interactive financial charts with multiple chart types
  createChart: tool({
    description: `Create interactive charts for financial data visualization.

    CHART TYPES:
    1. "line" - Time series trends (stock prices, revenue over time)
    2. "bar" - Categorical comparisons (quarterly earnings, company comparisons)
    3. "area" - Cumulative data (stacked metrics, composition)
    4. "scatter" - Correlation analysis, positioning maps, bubble charts
    5. "quadrant" - 2x2 strategic matrix (BCG matrix, Edge Zone analysis)

    TIME SERIES CHARTS (line, bar, area):
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
        }
      ]
    }

    SCATTER/BUBBLE CHARTS (for positioning, correlation):
    Each SERIES represents a CATEGORY (for color coding).
    Each DATA POINT represents an individual entity with x, y, size, and label.
    {
      "title": "Investor Universe: Strategic Fit vs Deal Likelihood",
      "type": "scatter",
      "xAxisLabel": "Strategic Complementarity (1-10)",
      "yAxisLabel": "Acquisition Likelihood (1-10)",
      "dataSeries": [
        {
          "name": "Financial Sponsors",
          "data": [
            {"x": 8.5, "y": 7.2, "size": 5000, "label": "Goldman Sachs"},
            {"x": 9.0, "y": 8.5, "size": 8000, "label": "Vista Equity"}
          ]
        },
        {
          "name": "Strategic Acquirers",
          "data": [
            {"x": 9.5, "y": 6.8, "size": 3000, "label": "Salesforce"}
          ]
        }
      ]
    }

    QUADRANT CHARTS (2x2 strategic matrix):
    Same as scatter, but with reference lines dividing chart into 4 quadrants.
    Use for: Edge Zone analysis, BCG matrix, prioritization matrices.

    CRITICAL: ALL REQUIRED FIELDS MUST BE PROVIDED.`,
    inputSchema: z.object({
      title: z
        .string()
        .describe('Chart title (e.g., "Apple vs Microsoft Stock Performance")'),
      type: z
        .enum(["line", "bar", "area", "scatter", "quadrant"])
        .describe(
          'Chart type: "line" (time series), "bar" (comparisons), "area" (cumulative), "scatter" (positioning/correlation), "quadrant" (2x2 matrix)'
        ),
      xAxisLabel: z
        .string()
        .describe('X-axis label (e.g., "Date", "Strategic Fit (1-10)", "Risk")'),
      yAxisLabel: z
        .string()
        .describe(
          'Y-axis label (e.g., "Price ($)", "Alpha Potential (1-10)", "Return")'
        ),
      dataSeries: z
        .array(
          z.object({
            name: z
              .string()
              .describe(
                'Series name - For time series: company/ticker. For scatter/quadrant: category name for color coding (e.g., "Financial Sponsors", "Strategic Acquirers")'
              ),
            data: z
              .array(
                z.object({
                  x: z
                    .union([z.string(), z.number()])
                    .describe(
                      'X-axis value - Date string for time series, numeric value for scatter/quadrant'
                    ),
                  y: z
                    .number()
                    .describe(
                      "Y-axis numeric value - price, score, percentage, etc. REQUIRED for all chart types."
                    ),
                  size: z
                    .number()
                    .optional()
                    .describe(
                      'Bubble size for scatter/quadrant charts (e.g., deal size in millions, market cap). Larger = bigger bubble.'
                    ),
                  label: z
                    .string()
                    .optional()
                    .describe(
                      'Individual entity name for scatter/quadrant charts (e.g., "Goldman Sachs", "Microsoft"). Displayed on/near bubble.'
                    ),
                })
              )
              .describe(
                "Array of data points. For time series: {x: date, y: value}. For scatter/quadrant: {x, y, size, label}."
              ),
          })
        )
        .describe(
          "REQUIRED: Array of data series. For scatter/quadrant: each series = category for color coding, each point = individual entity"
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
    }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;

      // Calculate metadata based on chart type
      let dateRange = null;
      if (type === 'scatter' || type === 'quadrant') {
        // For scatter/quadrant charts, show x and y axis ranges
        const allXValues = dataSeries.flatMap(s => s.data.map(d => Number(d.x)));
        const allYValues = dataSeries.flatMap(s => s.data.map(d => d.y ?? 0));
        if (allXValues.length > 0 && allYValues.length > 0) {
          dateRange = {
            start: `X: ${Math.min(...allXValues).toFixed(1)}-${Math.max(...allXValues).toFixed(1)}`,
            end: `Y: ${Math.min(...allYValues).toFixed(1)}-${Math.max(...allYValues).toFixed(1)}`,
          };
        }
      } else {
        // For time series charts, show date/label range
        if (dataSeries.length > 0 && dataSeries[0].data.length > 0) {
          dateRange = {
            start: dataSeries[0].data[0].x,
            end: dataSeries[0].data[dataSeries[0].data.length - 1].x,
          };
        }
      }

      // Build chart data object
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
          dateRange,
        },
      };

      // Save chart to database (requires authenticated user)
      let chartId: string | null = null;
      try {
        if (!userId) {
          console.warn('[createChart] No user ID - chart will not be saved (authentication required)');
        } else {
          chartId = randomUUID();

          const insertData = {
            id: chartId,
            user_id: userId,
            session_id: sessionId || null,
            chart_data: chartData,
          };

          await db.createChart(insertData);
        }
      } catch (error) {
        console.error('[createChart] Error saving chart:', error);
        chartId = null;
      }

      // Track chart creation
      await track('Chart Created', {
        chartType: type,
        title: title,
        seriesCount: dataSeries.length,
        totalDataPoints: dataSeries.reduce(
          (sum, series) => sum + series.data.length,
          0
        ),
        hasDescription: !!description,
        hasScatterData: dataSeries.some(s => s.data.some(d => d.size || d.label)),
        savedToDb: !!chartId,
      });

      // Return chart data with chartId and imageUrl for markdown embedding
      return {
        ...chartData,
        chartId: chartId || undefined,
        imageUrl: chartId ? `/api/charts/${chartId}/image` : undefined,
      };
    },
  }),

  // CSV Creation Tool - Generate downloadable CSV files for financial data
  createCSV: tool({
    description: `Create downloadable CSV files for financial data, tables, and analysis results.

    USE CASES:
    - Export financial statements (balance sheet, income statement, cash flow)
    - Create comparison tables (company metrics, product performance)
    - Generate time series data exports
    - Build data tables for further analysis
    - Create custom financial reports

    REFERENCING CSVs IN MARKDOWN:
    After creating a CSV, you MUST reference it in your markdown response to display it as an inline table.

    CRITICAL - Use this EXACT format:
    ![csv](csv:csvId)

    Where csvId is the ID returned in the tool response.

    Example:
    - Tool returns: { csvId: "abc-123-def-456", ... }
    - In your response: "Here is the data:\n\n![csv](csv:abc-123-def-456)\n\n"

    The CSV will automatically render as a formatted markdown table. Do NOT use link syntax [text](csv:id), ONLY use image syntax ![csv](csv:id).

    IMPORTANT GUIDELINES:
    - Use descriptive column headers
    - Include units in headers when applicable (e.g., "Revenue (USD millions)")
    - Format numbers appropriately (use consistent decimal places)
    - Add a title/description to explain the data
    - Organize data logically (chronological, alphabetical, or by importance)

    EXAMPLE - Company Comparison:
    {
      "title": "Tech Giants - Financial Metrics Comparison Q3 2024",
      "description": "Key financial metrics for major technology companies",
      "headers": ["Company", "Market Cap (B)", "Revenue (B)", "Net Income (B)", "P/E Ratio", "Employees"],
      "rows": [
        ["Apple", "2,800", "383.3", "97.0", "28.9", "164,000"],
        ["Microsoft", "2,750", "211.9", "72.4", "35.2", "221,000"],
        ["Google", "1,700", "307.4", "73.8", "23.1", "182,000"]
      ]
    }

    EXAMPLE - Time Series Data:
    {
      "title": "Apple Stock Price - Last 12 Months",
      "description": "Monthly closing prices for AAPL",
      "headers": ["Date", "Open", "High", "Low", "Close", "Volume"],
      "rows": [
        ["2024-01-01", "185.23", "196.45", "184.12", "193.58", "125000000"],
        ["2024-02-01", "193.50", "199.20", "190.10", "197.45", "118000000"]
      ]
    }

    EXAMPLE - Financial Statement:
    {
      "title": "Apple Inc. - Income Statement FY2023",
      "description": "Consolidated statement of operations (in millions)",
      "headers": ["Item", "FY2023", "FY2022", "Change %"],
      "rows": [
        ["Net Sales", "383,285", "394,328", "-2.8%"],
        ["Cost of Revenue", "214,137", "223,546", "-4.2%"],
        ["Gross Profit", "169,148", "170,782", "-1.0%"],
        ["Operating Expenses", "55,013", "51,345", "7.1%"],
        ["Operating Income", "114,135", "119,437", "-4.4%"]
      ]
    }

    The CSV will be rendered as an interactive table with download capability.`,
    inputSchema: z.object({
      title: z.string().describe("Title for the CSV file (will be used as filename)"),
      description: z.string().optional().describe("Optional description of the data"),
      headers: z.array(z.string()).describe("Column headers for the CSV"),
      rows: z.array(z.array(z.string())).describe("Data rows - each row is an array matching the headers"),
    }),
    execute: async ({ title, description, headers, rows }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;

      try {
        // Validate that all rows have the same number of columns as headers
        const headerCount = headers.length;
        const invalidRows = rows.filter(row => row.length !== headerCount);

        if (invalidRows.length > 0) {
          // Return error message instead of throwing - allows AI to continue
          return {
            error: true,
            message: `❌ **CSV Validation Error**: All rows must have ${headerCount} columns to match headers. Found ${invalidRows.length} invalid row(s). Please regenerate the CSV with matching column counts.`,
            title,
            headers,
            expectedColumns: headerCount,
            invalidRowCount: invalidRows.length,
          };
        }

        // Generate CSV content
        const csvContent = [
          headers.join(','),
          ...rows.map(row =>
            row.map(cell => {
              // Escape cells that contain commas, quotes, or newlines
              if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                return `"${cell.replace(/"/g, '""')}"`;
              }
              return cell;
            }).join(',')
          )
        ].join('\n');

        // Save CSV to database (requires authenticated user)
        let csvId: string | null = null;
        try {
          if (!userId) {
            console.warn('[createCSV] No user ID - CSV will not be saved (authentication required)');
          } else {
            csvId = randomUUID();

            const insertData = {
              id: csvId,
              user_id: userId,
              session_id: sessionId || null,
              title,
              description: description || undefined,
              headers,
              rows: rows,
            };

            await db.createCSV(insertData);
          }
        } catch (error) {
          console.error('[createCSV] Error saving CSV:', error);
          csvId = null;
        }

        // Track CSV creation
        await track('CSV Created', {
          title: title,
          rowCount: rows.length,
          columnCount: headers.length,
          hasDescription: !!description,
          savedToDb: !!csvId,
        });

        const result = {
          title,
          description,
          headers,
          rows,
          csvContent,
          rowCount: rows.length,
          columnCount: headers.length,
          csvId: csvId || undefined,
          csvUrl: csvId ? `/api/csvs/${csvId}` : undefined,
          _instructions: csvId
            ? `IMPORTANT: Include this EXACT line in your markdown response to display the table:\n\n![csv](csv:${csvId})\n\nDo not write [View Table] or any other text - use the image syntax above.`
            : undefined,
        };


        return result;
      } catch (error: any) {
        // Catch any unexpected errors and return error message
        return {
          error: true,
          message: `❌ **CSV Creation Error**: ${error.message || 'Unknown error occurred'}`,
          title,
        };
      }
    },
  }),

  codeExecution: tool({
    description: `Execute Python code securely in a Daytona Sandbox for financial modeling, data analysis, and calculations. CRITICAL: Always include print() statements to show results. Daytona can also capture rich artifacts (e.g., charts) when code renders images.

    ⚠️ CODE LENGTH LIMIT: Maximum 10,000 characters. Keep your code concise and focused.

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
    execute: async ({ code, description }, options) => {
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
      
      const startTime = Date.now();

      try {

        // Check for reasonable code length
        if (code.length > 10000) {
          return '🚫 **Error**: Code too long. Please limit your code to 10,000 characters.';
        }

        // Initialize Daytona client
        const daytonaApiKey = process.env.DAYTONA_API_KEY;
        if (!daytonaApiKey) {
          return '❌ **Configuration Error**: Daytona API key is not configured. Please set DAYTONA_API_KEY in your environment.';
        }

        const daytona = new Daytona({
          apiKey: daytonaApiKey,
          // Optional overrides if provided
          serverUrl: process.env.DAYTONA_API_URL,
          target: (process.env.DAYTONA_TARGET as any) || undefined,
        });

        let sandbox: any | null = null;
        try {
          // Create a Python sandbox
          sandbox = await daytona.create({ language: 'python' });

          // Execute the user's code
          const execution = await sandbox.process.codeRun(code);
          const executionTime = Date.now() - startTime;

          // Track code execution
          await track('Python Code Executed', {
            success: execution.exitCode === 0,
            codeLength: code.length,
            outputLength: execution.result?.length || 0,
            executionTime: executionTime,
            hasDescription: !!description,
            hasError: execution.exitCode !== 0,
            hasArtifacts: !!execution.artifacts
          });

          // Note: Daytona execution billing is handled separately (not per-tool tracking)

          // Handle execution errors
          if (execution.exitCode !== 0) {
            // Provide helpful error messages for common issues
            let helpfulError = execution.result || 'Unknown execution error';
            if (helpfulError.includes('NameError')) {
              helpfulError = `${helpfulError}\n\n💡 **Tip**: Make sure all variables are defined before use. If you're trying to calculate something, include the full calculation in your code.`;
            } else if (helpfulError.includes('SyntaxError')) {
              helpfulError = `${helpfulError}\n\n💡 **Tip**: Check your Python syntax. Make sure all parentheses, quotes, and indentation are correct.`;
            } else if (helpfulError.includes('ModuleNotFoundError')) {
              helpfulError = `${helpfulError}\n\n💡 **Tip**: You can install packages inside the Daytona sandbox using pip if needed (e.g., pip install numpy).`;
            }

            return `❌ **Execution Error**: ${helpfulError}`;
          }

          // Format the successful execution result
          return `🐍 **Python Code Execution (Daytona Sandbox)**
${description ? `**Description**: ${description}\n` : ""}

\`\`\`python
${code}
\`\`\`

**Output:**
\`\`\`
${execution.result || "(No output produced)"}
\`\`\`

⏱️ **Execution Time**: ${executionTime}ms`;

        } finally {
          // Clean up sandbox
          try {
            if (sandbox) {
              await sandbox.delete();
            }
          } catch (cleanupError) {
          }
        }
        
      } catch (error: any) {
        
        return `❌ **Error**: Failed to execute Python code. ${error.message || 'Unknown error occurred'}`;
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
    execute: async ({ query, dataType, maxResults }, options) => {
      const valyuAccessToken = (options as any)?.experimental_context?.valyuAccessToken;

      try {
        // Configure search based on data type
        const searchOptions: any = {
          query,
          maxNumResults: maxResults || 10,
        };

        const response = await callValyuApi('/v1/deepsearch', searchOptions, valyuAccessToken);

        // Track Valyu financial search call
        await track('Valyu API Call', {
          toolType: 'financialSearch',
          query: query,
          dataType: dataType || 'auto',
          maxResults: maxResults || 10,
          resultCount: response?.results?.length || 0,
          usedOAuthProxy: !!valyuAccessToken,
          cost: (response as any)?.total_deduction_dollars || null,
          txId: (response as any)?.tx_id || null
        });

        if (!response || !response.results || response.results.length === 0) {
          return `🔍 No financial data found for "${query}". Try rephrasing your search or checking if the company/symbol exists.`;
        }
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

  wileySearch: tool({
    description:
      "Wiley finance/business/accounting corpus search for authoritative academic content",
    inputSchema: z.object({
      query: z.string().describe("Search query for Wiley finance/business/accounting corpus"),
      maxResults: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .default(10)
        .describe("Maximum number of results to return"),
    }),
    execute: async ({ query, maxResults }, options) => {
      const valyuAccessToken = (options as any)?.experimental_context?.valyuAccessToken;

      try {
        // Configure search options for Wiley sources
        const searchOptions: any = {
          query,
          maxNumResults: maxResults || 10,
          includedSources: [
            "wiley/wiley-finance-papers",
            "wiley/wiley-finance-books"
          ]
        };

        const response = await callValyuApi('/v1/deepsearch', searchOptions, valyuAccessToken);

        // Track Valyu Wiley search call
        await track('Valyu API Call', {
          toolType: 'wileySearch',
          query: query,
          maxResults: maxResults || 10,
          resultCount: response?.results?.length || 0,
          usedOAuthProxy: !!valyuAccessToken,
          cost: (response as any)?.total_deduction_dollars || null,
          txId: (response as any)?.tx_id || null
        });

        if (!response || !response.results || response.results.length === 0) {
          return `🔍 No Wiley academic results found for "${query}". Try rephrasing your search.`;
        }

        // Return structured data for the model to process
        const formattedResponse = {
          type: "wiley_search",
          query: query,
          resultCount: response.results.length,
          results: response.results.map((result: any) => ({
            title: result.title || "Wiley Academic Result",
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

        return `❌ Error searching Wiley academic data: ${
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
    execute: async ({ query, maxResults }, options) => {
      const valyuAccessToken = (options as any)?.experimental_context?.valyuAccessToken;

      try {
        // Configure search options
        const searchOptions = {
          query,
          searchType: "all" as const, // Search both proprietary and web sources
          maxNumResults: maxResults || 5,
          isToolCall: true, // true for AI agents/tools
        };

        const response = await callValyuApi('/v1/deepsearch', searchOptions, valyuAccessToken);

        // Track Valyu web search call
        await track('Valyu API Call', {
          toolType: 'webSearch',
          query: query,
          maxResults: maxResults || 5,
          resultCount: response?.results?.length || 0,
          usedOAuthProxy: !!valyuAccessToken,
          cost: (response as any)?.metadata?.totalCost || (response as any)?.total_deduction_dollars || null,
          searchTime: (response as any)?.metadata?.searchTime || null,
          txId: (response as any)?.tx_id || null
        });

        if (!response || !response.results || response.results.length === 0) {
          return `🔍 No web results found for "${query}". Try rephrasing your search with different keywords.`;
        }

        // Log key information about the search
        const metadata = (response as any).metadata;
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
