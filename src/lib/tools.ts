import { z } from "zod";
import { tool } from "ai";
import { track } from "@vercel/analytics/server";
import { Daytona } from '@daytonaio/sdk';
import { randomUUID } from 'crypto';
import {
  webSearch as valyuWebSearch,
  financeSearch as valyuFinanceSearch,
  secSearch as valyuSecSearch,
  economicsSearch as valyuEconomicsSearch,
  patentSearch as valyuPatentSearch,
} from '@valyu/ai-sdk';
import * as db from '@/lib/db';

const isSelfHostedMode = process.env.NEXT_PUBLIC_APP_MODE === 'self-hosted';
const VALYU_OAUTH_PROXY_URL = process.env.VALYU_OAUTH_PROXY_URL ||
  `${process.env.VALYU_APP_URL || process.env.NEXT_PUBLIC_VALYU_APP_URL || 'https://platform.valyu.ai'}/api/oauth/proxy`;

async function callValyuOAuthProxy(requestBody: Record<string, any>, valyuAccessToken: string): Promise<any> {
  const startTime = Date.now();
  console.log('[ValyuProxy] Request:', { query: requestBody.query, search_type: requestBody.search_type, sources: requestBody.included_sources });

  const response = await fetch(VALYU_OAUTH_PROXY_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${valyuAccessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: '/v1/deepsearch', method: 'POST', body: requestBody }),
  });

  const elapsed = Date.now() - startTime;

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'proxy_failed' }));
    console.error('[ValyuProxy] Error:', { status: response.status, error, elapsed: `${elapsed}ms` });
    throw new Error(error.error_description || error.error || 'Valyu proxy request failed');
  }

  const data = await response.json();
  console.log('[ValyuProxy] Success:', { results: data?.results?.length || 0, elapsed: `${elapsed}ms` });
  return data;
}

function formatSearchError(error: unknown, toolName: string): string {
  const errorMsg = error instanceof Error ? error.message : 'Unknown error';
  console.error(`[${toolName}] Error:`, { message: errorMsg, stack: error instanceof Error ? error.stack : undefined });

  if (!(error instanceof Error)) return `Error in ${toolName}: Unknown error`;

  const msg = error.message;
  if (msg.includes('401') || msg.includes('unauthorized')) return 'Authentication error with Valyu API.';
  if (msg.includes('429')) return 'Rate limit exceeded. Please try again in a moment.';
  if (msg.includes('network') || msg.includes('fetch')) return 'Network error connecting to Valyu API.';
  return `Error in ${toolName}: ${msg}`;
}

async function trackValyuCall(toolType: string, query: string, response: any, usedOAuthProxy: boolean): Promise<void> {
  await track('Valyu API Call', {
    toolType,
    query,
    maxResults: 5,
    resultCount: response?.results?.length || 0,
    usedOAuthProxy,
    cost: response?.total_deduction_dollars || null,
    txId: response?.tx_id || null
  });
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

      // Save chart to database if authenticated
      let chartId: string | null = null;
      if (userId) {
        try {
          chartId = randomUUID();
          await db.createChart({
            id: chartId,
            user_id: userId,
            session_id: sessionId || null,
            chart_data: chartData,
          });
        } catch (error) {
          console.error('[createChart] Error saving:', error);
          chartId = null;
        }
      }

      const totalDataPoints = dataSeries.reduce((sum, s) => sum + s.data.length, 0);
      await track('Chart Created', {
        chartType: type,
        title,
        seriesCount: dataSeries.length,
        totalDataPoints,
        hasDescription: !!description,
        hasScatterData: dataSeries.some(s => s.data.some(d => d.size || d.label)),
        savedToDb: !!chartId,
      });

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

        // Save CSV to database if authenticated
        let csvId: string | null = null;
        if (userId) {
          try {
            csvId = randomUUID();
            await db.createCSV({
              id: csvId,
              user_id: userId,
              session_id: sessionId || null,
              title,
              description: description || undefined,
              headers,
              rows,
            });
          } catch (error) {
            console.error('[createCSV] Error saving:', error);
            csvId = null;
          }
        }

        await track('CSV Created', {
          title,
          rowCount: rows.length,
          columnCount: headers.length,
          hasDescription: !!description,
          savedToDb: !!csvId,
        });

        return {
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
    execute: async ({ code, description }) => {
      const startTime = Date.now();

      if (code.length > 10000) {
        return 'Error: Code too long. Please limit to 10,000 characters.';
      }

      const daytonaApiKey = process.env.DAYTONA_API_KEY;
      if (!daytonaApiKey) {
        return 'Configuration Error: Daytona API key not configured.';
      }

      const daytona = new Daytona({
        apiKey: daytonaApiKey,
        serverUrl: process.env.DAYTONA_API_URL,
        target: (process.env.DAYTONA_TARGET as any) || undefined,
      });

      let sandbox: any | null = null;
      try {
        sandbox = await daytona.create({ language: 'python' });
        const execution = await sandbox.process.codeRun(code);
        const executionTime = Date.now() - startTime;

        await track('Python Code Executed', {
          success: execution.exitCode === 0,
          codeLength: code.length,
          outputLength: execution.result?.length || 0,
          executionTime,
          hasDescription: !!description,
          hasError: execution.exitCode !== 0,
          hasArtifacts: !!execution.artifacts
        });

        if (execution.exitCode !== 0) {
          let errorMsg = execution.result || 'Unknown execution error';
          if (errorMsg.includes('NameError')) {
            errorMsg += '\n\nTip: Make sure all variables are defined before use.';
          } else if (errorMsg.includes('SyntaxError')) {
            errorMsg += '\n\nTip: Check your Python syntax - parentheses, quotes, and indentation.';
          } else if (errorMsg.includes('ModuleNotFoundError')) {
            errorMsg += '\n\nTip: You can install packages via pip in the sandbox.';
          }
          return `Execution Error: ${errorMsg}`;
        }

        return `**Python Code Execution (Daytona Sandbox)**
${description ? `**Description**: ${description}\n` : ""}
\`\`\`python
${code}
\`\`\`

**Output:**
\`\`\`
${execution.result || "(No output produced)"}
\`\`\`

**Execution Time**: ${executionTime}ms`;

      } catch (error: any) {
        return `Error: Failed to execute Python code. ${error.message || 'Unknown error'}`;
      } finally {
        if (sandbox) {
          try { await sandbox.delete(); } catch {}
        }
      }
    },
  }),

  ...(isSelfHostedMode
    ? { webSearch: valyuWebSearch({ maxNumResults: 5 }) }
    : {
        webSearch: tool({
          description: "Search the web for current information, news, and articles. The API handles natural language - use simple, clear queries.",
          inputSchema: z.object({
            query: z.string().min(1).max(500).describe("Natural language query (e.g., 'latest AI developments', 'Tesla Q4 2024 earnings')"),
            includedSources: z.array(z.string()).optional().describe("Restrict search to specific domains or sources (e.g., ['nature.com', 'arxiv.org']). Cannot be used with excludedSources."),
            excludedSources: z.array(z.string()).optional().describe("Exclude specific domains or sources from results (e.g., ['reddit.com', 'quora.com']). Cannot be used with includedSources."),
          }),
          execute: async ({ query, includedSources, excludedSources }, options) => {
            const valyuAccessToken = (options as any)?.experimental_context?.valyuAccessToken;
            try {
              const requestBody: any = { query, search_type: 'all', max_num_results: 5 };
              if (includedSources && includedSources.length > 0) {
                requestBody.included_sources = includedSources;
              }
              if (excludedSources && excludedSources.length > 0) {
                requestBody.excluded_sources = excludedSources;
              }
              const response = await callValyuOAuthProxy(requestBody, valyuAccessToken);
              await trackValyuCall('webSearch', query, response, true);
              return response?.results?.length ? response : `🔍 No web results found for "${query}".`;
            } catch (error) {
              return formatSearchError(error, 'webSearch');
            }
          },
        }),
      }),

  ...(isSelfHostedMode
    ? {
        financeSearch: tool({
          description: "Search financial data: stock prices, earnings, balance sheets, income statements, cash flows, SEC filings, dividends, insider transactions, crypto, forex, and economic indicators. The API handles natural language - ask your full question in one query per topic.",
          inputSchema: z.object({
            query: z.string().min(1).max(500).describe("Natural language query (e.g., 'Apple stock price Q1-Q3 2020', 'Tesla revenue last 4 quarters')"),
          }),
          execute: async ({ query }) => {
            const startTime = Date.now();
            console.log('[financeSearch] Query:', query);
            try {
              const apiKey = process.env.VALYU_API_KEY;
              if (!apiKey) throw new Error('VALYU_API_KEY required');
              const res = await fetch('https://api.valyu.ai/v1/deepsearch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                body: JSON.stringify({
                  query,
                  search_type: 'proprietary',
                  max_num_results: 5,
                  included_sources: [
                    'valyu/valyu-stocks',
                    'valyu/valyu-sec-filings',
                    'valyu/valyu-earnings-US',
                    'valyu/valyu-balance-sheet-US',
                    'valyu/valyu-income-statement-US',
                    'valyu/valyu-cash-flow-US',
                    'valyu/valyu-dividends-US',
                    'valyu/valyu-insider-transactions-US',
                    'valyu/valyu-market-movers-US',
                    'valyu/valyu-crypto',
                    'valyu/valyu-forex',
                    'valyu/valyu-bls',
                    'valyu/valyu-fred',
                    'valyu/valyu-world-bank',
                  ],
                }),
              });
              if (!res.ok) {
                const errBody = await res.text().catch(() => '');
                console.error('[financeSearch] API Error:', { status: res.status, body: errBody });
                throw new Error(`API error: ${res.status} - ${errBody}`);
              }
              const response = await res.json();
              console.log('[financeSearch] Success:', { results: response?.results?.length || 0, elapsed: `${Date.now() - startTime}ms` });
              await trackValyuCall('financeSearch', query, response, false);
              return response?.results?.length ? response : `🔍 No financial data found for "${query}".`;
            } catch (error) {
              return formatSearchError(error, 'financeSearch');
            }
          },
        }),
      }
    : {
        financeSearch: tool({
          description: "Search financial data: stock prices, earnings, balance sheets, income statements, cash flows, SEC filings, dividends, insider transactions, crypto, forex, and economic indicators. The API handles natural language - ask your full question in one query per topic.",
          inputSchema: z.object({
            query: z.string().min(1).max(500).describe("Natural language query (e.g., 'Apple stock price Q1-Q3 2020', 'Tesla revenue last 4 quarters')"),
          }),
          execute: async ({ query }, options) => {
            const valyuAccessToken = (options as any)?.experimental_context?.valyuAccessToken;
            try {
              const response = await callValyuOAuthProxy({
                query,
                search_type: 'proprietary',
                max_num_results: 5,
                included_sources: [
                  'valyu/valyu-stocks',
                  'valyu/valyu-sec-filings',
                  'valyu/valyu-earnings-US',
                  'valyu/valyu-balance-sheet-US',
                  'valyu/valyu-income-statement-US',
                  'valyu/valyu-cash-flow-US',
                  'valyu/valyu-dividends-US',
                  'valyu/valyu-insider-transactions-US',
                  'valyu/valyu-market-movers-US',
                  'valyu/valyu-crypto',
                  'valyu/valyu-forex',
                  'valyu/valyu-bls',
                  'valyu/valyu-fred',
                  'valyu/valyu-world-bank',
                ],
              }, valyuAccessToken);
              await trackValyuCall('financeSearch', query, response, true);
              return response?.results?.length ? response : `🔍 No financial data found for "${query}".`;
            } catch (error) {
              return formatSearchError(error, 'financeSearch');
            }
          },
        }),
      }),

  ...(isSelfHostedMode
    ? {
        secSearch: tool({
          description: "Search SEC filings (10-K, 10-Q, 8-K, proxy statements). Use simple natural language with company name and filing type - no accession numbers or technical syntax needed.",
          inputSchema: z.object({
            query: z.string().min(1).max(500).describe("Natural language query (e.g., 'Tesla 10-K risk factors', 'Apple executive compensation 2024')"),
          }),
          execute: async ({ query }) => {
            const startTime = Date.now();
            console.log('[secSearch] Query:', query);
            try {
              const apiKey = process.env.VALYU_API_KEY;
              if (!apiKey) throw new Error('VALYU_API_KEY required');
              const res = await fetch('https://api.valyu.ai/v1/deepsearch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                body: JSON.stringify({ query, search_type: 'proprietary', max_num_results: 5, included_sources: ['valyu/valyu-sec-filings'] }),
              });
              if (!res.ok) {
                const errBody = await res.text().catch(() => '');
                console.error('[secSearch] API Error:', { status: res.status, body: errBody });
                throw new Error(`API error: ${res.status} - ${errBody}`);
              }
              const response = await res.json();
              console.log('[secSearch] Success:', { results: response?.results?.length || 0, elapsed: `${Date.now() - startTime}ms` });
              await trackValyuCall('secSearch', query, response, false);
              return response?.results?.length ? response : `🔍 No SEC filings found for "${query}".`;
            } catch (error) {
              return formatSearchError(error, 'secSearch');
            }
          },
        }),
      }
    : {
        secSearch: tool({
          description: "Search SEC filings (10-K, 10-Q, 8-K, proxy statements). Use simple natural language with company name and filing type - no accession numbers or technical syntax needed.",
          inputSchema: z.object({
            query: z.string().min(1).max(500).describe("Natural language query (e.g., 'Tesla 10-K risk factors', 'Apple executive compensation 2024')"),
          }),
          execute: async ({ query }, options) => {
            const valyuAccessToken = (options as any)?.experimental_context?.valyuAccessToken;
            try {
              const response = await callValyuOAuthProxy({ query, search_type: 'proprietary', max_num_results: 5, included_sources: ['valyu/valyu-sec-filings'] }, valyuAccessToken);
              await trackValyuCall('secSearch', query, response, true);
              return response?.results?.length ? response : `🔍 No SEC filings found for "${query}".`;
            } catch (error) {
              return formatSearchError(error, 'secSearch');
            }
          },
        }),
      }),

  ...(isSelfHostedMode
    ? { economicsSearch: valyuEconomicsSearch({ maxNumResults: 3 }) }
    : {
        economicsSearch: tool({
          description: "Search economic data from BLS, FRED, World Bank. The API handles natural language - no need for series IDs or technical codes.",
          inputSchema: z.object({
            query: z.string().min(1).max(500).describe("Natural language query (e.g., 'CPI vs unemployment since 2020', 'US GDP growth last 5 years')"),
          }),
          execute: async ({ query }, options) => {
            const valyuAccessToken = (options as any)?.experimental_context?.valyuAccessToken;
            try {
              const response = await callValyuOAuthProxy({
                query,
                search_type: 'proprietary',
                max_num_results: 3,
                included_sources: [
                  'valyu/valyu-bls',
                  'valyu/valyu-fred',
                  'valyu/valyu-world-bank',
                  'valyu/valyu-worldbank-indicators',
                  'valyu/valyu-usaspending',
                ],
              }, valyuAccessToken);
              await trackValyuCall('economicsSearch', query, response, true);
              return response?.results?.length ? response : `🔍 No economic data found for "${query}".`;
            } catch (error) {
              return formatSearchError(error, 'economicsSearch');
            }
          },
        }),
      }),

  ...(isSelfHostedMode
    ? { patentSearch: valyuPatentSearch({ maxNumResults: 5 }) }
    : {
        patentSearch: tool({
          description: "Search patent databases for inventions and intellectual property. The API handles natural language - no need for patent numbers or classification codes.",
          inputSchema: z.object({
            query: z.string().min(1).max(500).describe("Natural language query (e.g., 'solid-state battery patents', 'CRISPR gene editing methods')"),
          }),
          execute: async ({ query }, options) => {
            const valyuAccessToken = (options as any)?.experimental_context?.valyuAccessToken;
            try {
              const response = await callValyuOAuthProxy({ query, search_type: 'proprietary', max_num_results: 5, included_sources: ['valyu/valyu-patents'] }, valyuAccessToken);
              await trackValyuCall('patentSearch', query, response, true);
              return response?.results?.length ? response : `🔍 No patents found for "${query}".`;
            } catch (error) {
              return formatSearchError(error, 'patentSearch');
            }
          },
        }),
      }),

  ...(isSelfHostedMode
    ? {
        financeJournalSearch: tool({
          description: "Search Wiley finance/business/accounting corpus for authoritative academic content including peer-reviewed papers, textbooks, and scholarly research.",
          inputSchema: z.object({
            query: z.string().min(1).max(500).describe("Academic finance query (e.g., 'options pricing models', 'portfolio optimization theory', 'risk management frameworks')"),
          }),
          execute: async ({ query }) => {
            const startTime = Date.now();
            console.log('[financeJournalSearch] Query:', query);
            try {
              const apiKey = process.env.VALYU_API_KEY;
              if (!apiKey) throw new Error('VALYU_API_KEY required');
              const res = await fetch('https://api.valyu.ai/v1/deepsearch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                body: JSON.stringify({ query, search_type: 'proprietary', max_num_results: 5, included_sources: ['wiley/wiley-finance-papers', 'wiley/wiley-finance-books'] }),
              });
              if (!res.ok) {
                const errBody = await res.text().catch(() => '');
                console.error('[financeJournalSearch] API Error:', { status: res.status, body: errBody });
                throw new Error(`API error: ${res.status}`);
              }
              const response = await res.json();
              console.log('[financeJournalSearch] Success:', { results: response?.results?.length || 0, elapsed: `${Date.now() - startTime}ms` });
              await trackValyuCall('financeJournalSearch', query, response, false);
              return response?.results?.length ? response : `🔍 No finance journal results found for "${query}".`;
            } catch (error) {
              return formatSearchError(error, 'financeJournalSearch');
            }
          },
        }),
      }
    : {
        financeJournalSearch: tool({
          description: "Search Wiley finance/business/accounting corpus for authoritative academic content including peer-reviewed papers, textbooks, and scholarly research.",
          inputSchema: z.object({
            query: z.string().min(1).max(500).describe("Academic finance query (e.g., 'options pricing models', 'portfolio optimization theory', 'risk management frameworks')"),
          }),
          execute: async ({ query }, options) => {
            const valyuAccessToken = (options as any)?.experimental_context?.valyuAccessToken;
            try {
              const response = await callValyuOAuthProxy({ query, search_type: 'proprietary', max_num_results: 5, included_sources: ['wiley/wiley-finance-papers', 'wiley/wiley-finance-books'] }, valyuAccessToken);
              await trackValyuCall('financeJournalSearch', query, response, true);
              return response?.results?.length ? response : `🔍 No finance journal results found for "${query}".`;
            } catch (error) {
              return formatSearchError(error, 'financeJournalSearch');
            }
          },
        }),
      }),

  ...(isSelfHostedMode
    ? {
        polymarketSearch: tool({
          description: "Search Polymarket prediction market data for event probabilities, market odds, and sentiment on financial, economic, and geopolitical events.",
          inputSchema: z.object({
            query: z.string().min(1).max(500).describe("Prediction market query (e.g., 'Fed interest rate probability', 'election odds', 'Bitcoin price prediction')"),
          }),
          execute: async ({ query }) => {
            const startTime = Date.now();
            console.log('[polymarketSearch] Query:', query);
            try {
              const apiKey = process.env.VALYU_API_KEY;
              if (!apiKey) throw new Error('VALYU_API_KEY required');
              const res = await fetch('https://api.valyu.ai/v1/deepsearch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                body: JSON.stringify({ query, search_type: 'proprietary', max_num_results: 5, included_sources: ['valyu/valyu-polymarket'] }),
              });
              if (!res.ok) {
                const errBody = await res.text().catch(() => '');
                console.error('[polymarketSearch] API Error:', { status: res.status, body: errBody });
                throw new Error(`API error: ${res.status}`);
              }
              const response = await res.json();
              console.log('[polymarketSearch] Success:', { results: response?.results?.length || 0, elapsed: `${Date.now() - startTime}ms` });
              await trackValyuCall('polymarketSearch', query, response, false);
              return response?.results?.length ? response : `🔍 No Polymarket data found for "${query}".`;
            } catch (error) {
              return formatSearchError(error, 'polymarketSearch');
            }
          },
        }),
      }
    : {
        polymarketSearch: tool({
          description: "Search Polymarket prediction market data for event probabilities, market odds, and sentiment on financial, economic, and geopolitical events.",
          inputSchema: z.object({
            query: z.string().min(1).max(500).describe("Prediction market query (e.g., 'Fed interest rate probability', 'election odds', 'Bitcoin price prediction')"),
          }),
          execute: async ({ query }, options) => {
            const valyuAccessToken = (options as any)?.experimental_context?.valyuAccessToken;
            try {
              const response = await callValyuOAuthProxy({ query, search_type: 'proprietary', max_num_results: 5, included_sources: ['valyu/valyu-polymarket'] }, valyuAccessToken);
              await trackValyuCall('polymarketSearch', query, response, true);
              return response?.results?.length ? response : `🔍 No Polymarket data found for "${query}".`;
            } catch (error) {
              return formatSearchError(error, 'polymarketSearch');
            }
          },
        }),
      }),
};
