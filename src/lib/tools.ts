import { z } from "zod";
import { tool } from "ai";
import { Valyu } from "valyu-js";
import { track } from "@vercel/analytics/server";
import { PolarEventTracker } from '@/lib/polar-events';
import { Daytona } from '@daytonaio/sdk';
import { createClient } from '@/utils/supabase/server';


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
    6. "candlestick" - OHLC + Volume data (stock price movements with volume bars)

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

    CANDLESTICK CHARTS (OHLC + Volume):
    For displaying stock/crypto price movements with candlesticks and volume bars.
    Each data point requires: x (date), open, high, low, close, volume (optional).
    {
      "title": "Tesla (TSLA) Stock Price - Q4 2024",
      "type": "candlestick",
      "xAxisLabel": "Date",
      "yAxisLabel": "Price (USD)",
      "dataSeries": [
        {
          "name": "TSLA",
          "data": [
            {"x": "2024-10-01", "open": 250.5, "high": 258.2, "low": 248.1, "close": 255.8, "volume": 12500000},
            {"x": "2024-10-02", "open": 255.8, "high": 262.4, "low": 253.0, "close": 260.2, "volume": 15200000}
          ]
        }
      ]
    }

    CRITICAL: ALL REQUIRED FIELDS MUST BE PROVIDED.`,
    inputSchema: z.object({
      title: z
        .string()
        .describe('Chart title (e.g., "Apple vs Microsoft Stock Performance")'),
      type: z
        .enum(["line", "bar", "area", "scatter", "quadrant", "candlestick"])
        .describe(
          'Chart type: "line" (time series), "bar" (comparisons), "area" (cumulative), "scatter" (positioning/correlation), "quadrant" (2x2 matrix), "candlestick" (OHLC + volume for stocks)'
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
                    .optional()
                    .describe(
                      "Y-axis numeric value - price, score, percentage, etc. REQUIRED for line/bar/area/scatter/quadrant charts. Optional ONLY for candlestick charts (will use 'close' field)."
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
                  open: z
                    .number()
                    .optional()
                    .describe(
                      'Opening price for candlestick charts. Required for type="candlestick".'
                    ),
                  high: z
                    .number()
                    .optional()
                    .describe(
                      'Highest price for candlestick charts. Required for type="candlestick".'
                    ),
                  low: z
                    .number()
                    .optional()
                    .describe(
                      'Lowest price for candlestick charts. Required for type="candlestick".'
                    ),
                  close: z
                    .number()
                    .optional()
                    .describe(
                      'Closing price for candlestick charts (can use y field as fallback). Required for type="candlestick".'
                    ),
                  volume: z
                    .number()
                    .optional()
                    .describe(
                      'Trading volume for candlestick charts. Optional but recommended for type="candlestick".'
                    ),
                })
              )
              .describe(
                "Array of data points. For time series: {x: date, y: value}. For scatter: {x, y, size, label}. For candlestick: {x: date, open, high, low, close, volume} (y is optional, will use close value)."
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

      // Save chart to database
      let chartId: string | null = null;
      try {
        const supabase = await createClient();

        // Build insert data - include anonymous_id if no user_id
        const insertData: any = {
          session_id: sessionId || null,
          chart_data: chartData,
        };

        if (userId) {
          insertData.user_id = userId;
        } else {
          // For anonymous users, use a temporary ID
          // In production, this should come from a browser-generated UUID
          insertData.anonymous_id = 'anonymous';
        }

        const { data: savedChart, error } = await supabase
          .from('charts')
          .insert(insertData)
          .select('id')
          .single();

        if (error) {
          console.error('[createChart] Error saving chart to database:', error);
          console.error('[createChart] Insert data:', insertData);
        } else {
          chartId = savedChart.id;
          console.log('[createChart] Successfully saved chart with ID:', chartId);
        }
      } catch (error) {
        console.error('[createChart] Database error:', error);
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

        // Save CSV to database
        let csvId: string | null = null;
        try {
          const supabase = await createClient();

          console.log('[createCSV] Saving CSV with rows type:', typeof rows, 'isArray:', Array.isArray(rows));
          console.log('[createCSV] First row sample:', rows[0]);

          // Build insert data - include anonymous_id if no user_id
          const insertData: any = {
            session_id: sessionId || null,
            title,
            description: description || null,
            headers,
            rows: rows, // Send as-is, let Postgres handle JSONB
          };

          if (userId) {
            insertData.user_id = userId;
          } else {
            // For anonymous users, use a temporary ID
            // In production, this should come from a browser-generated UUID
            insertData.anonymous_id = 'anonymous';
          }

          const { data: savedCsv, error } = await supabase
            .from('csvs')
            .insert(insertData)
            .select('id')
            .single();

          if (error) {
            console.error('[createCSV] Error saving CSV to database:', error);
            console.error('[createCSV] Error details:', JSON.stringify(error, null, 2));
            console.error('[createCSV] Insert data:', insertData);
          } else {
            csvId = savedCsv.id;
            console.log('[createCSV] Successfully saved CSV with ID:', csvId);
          }
        } catch (error) {
          console.error('[createCSV] Database error:', error);
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

        console.log('[createCSV] Returning result with instructions:', result._instructions);

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

          // Track usage for pay-per-use customers with Polar events
          if (userId && sessionId && userTier === 'pay_per_use' && execution.exitCode === 0 && !isDevelopment) {
            try {
              const polarTracker = new PolarEventTracker();
              
              await polarTracker.trackDaytonaUsage(
                userId,
                sessionId,
                executionTime,
                {
                  codeLength: code.length,
                  hasArtifacts: !!execution.artifacts,
                  success: execution.exitCode === 0,
                  description: description || 'Code execution'
                }
              );
            } catch (error) {
              console.error('[CodeExecution] Failed to track Daytona usage:', error);
              // Don't fail the tool execution if usage tracking fails
            }
          }

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
            console.error('[CodeExecution] Failed to delete Daytona sandbox:', cleanupError);
          }
        }
        
      } catch (error: any) {
        console.error('[CodeExecution] Error:', error);
        
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
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
      
      try {
        // Check if Valyu API key is available
        const apiKey = process.env.VALYU_API_KEY;
        if (!apiKey) {
          return "❌ Valyu API key not configured. Please add VALYU_API_KEY to your environment variables to enable financial search.";
        }
        const valyu = new Valyu(apiKey, "https://api.valyu.ai/v1");

        // Configure search based on data type
        let searchOptions: any = {
          maxNumResults: maxResults || 10,
        };

        const response = await valyu.search(query, searchOptions);

        // Track Valyu financial search call
        await track('Valyu API Call', {
          toolType: 'financialSearch',
          query: query,
          dataType: dataType || 'auto',
          maxResults: maxResults || 10,
          resultCount: response?.results?.length || 0,
          hasApiKey: !!apiKey,
          cost: (response as any)?.total_deduction_dollars || null,
          txId: (response as any)?.tx_id || null
        });

        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            // Use the actual Valyu API cost from response
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            
            
            await polarTracker.trackValyuAPIUsage(
              userId,
              sessionId,
              'financialSearch',
              valyuCostDollars,
              {
                query,
                resultCount: response?.results?.length || 0,
                dataType: dataType || 'auto',
                success: true,
                tx_id: (response as any)?.tx_id
              }
            );
          } catch (error) {
            console.error('[FinancialSearch] Failed to track Valyu API usage:', error);
            // Don't fail the search if usage tracking fails
          }
        }

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
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';

      try {
        // Check if Valyu API key is available
        const apiKey = process.env.VALYU_API_KEY;
        if (!apiKey) {
          return "❌ Valyu API key not configured. Please add VALYU_API_KEY to your environment variables to enable Wiley search.";
        }
        const valyu = new Valyu(apiKey, "https://api.valyu.ai/v1");

        // Configure search options for Wiley sources
        const searchOptions: any = {
          maxNumResults: maxResults || 10,
          includedSources: [
            "wiley/wiley-finance-papers",
            "wiley/wiley-finance-books"
          ]
        };

        const response = await valyu.search(query, searchOptions);

        // Track Valyu Wiley search call
        await track('Valyu API Call', {
          toolType: 'wileySearch',
          query: query,
          maxResults: maxResults || 10,
          resultCount: response?.results?.length || 0,
          hasApiKey: !!apiKey,
          cost: (response as any)?.total_deduction_dollars || null,
          txId: (response as any)?.tx_id || null
        });

        // Track usage for pay-per-use customers with Polar events
        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            await polarTracker.trackValyuAPIUsage(
              userId,
              sessionId,
              'wileySearch',
              valyuCostDollars,
              {
                query,
                resultCount: response?.results?.length || 0,
                success: true,
                tx_id: (response as any)?.tx_id
              }
            );
          } catch (error) {
            console.error('[WileySearch] Failed to track Valyu API usage:', error);
            // Don't fail the search if usage tracking fails
          }
        }

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
      const userId = (options as any)?.experimental_context?.userId;
      const sessionId = (options as any)?.experimental_context?.sessionId;
      const userTier = (options as any)?.experimental_context?.userTier;
      const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
      
      try {
        // Initialize Valyu client (uses default/free tier if no API key)
        const valyu = new Valyu(
          process.env.VALYU_API_KEY,
          "https://api.valyu.ai/v1"
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
          cost: (response as any)?.metadata?.totalCost || (response as any)?.total_deduction_dollars || null,
          searchTime: (response as any)?.metadata?.searchTime || null,
          txId: (response as any)?.tx_id || null
        });

        // Track usage for pay-per-use customers with Polar events
        if (userId && sessionId && userTier === 'pay_per_use' && !isDevelopment) {
          try {
            const polarTracker = new PolarEventTracker();
            // Use the actual Valyu API cost from response
            const valyuCostDollars = (response as any)?.total_deduction_dollars || 0;
            
            await polarTracker.trackValyuAPIUsage(
              userId,
              sessionId,
              'webSearch',
              valyuCostDollars,
              {
                query,
                resultCount: response?.results?.length || 0,
                success: true,
                tx_id: (response as any)?.tx_id,
                search_time: (response as any)?.metadata?.searchTime
              }
            );
          } catch (error) {
            console.error('[WebSearch] Failed to track Valyu API usage:', error);
            // Don't fail the search if usage tracking fails
          }
        }

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
