import { streamText, convertToModelMessages } from "ai";
import { financeTools } from "@/lib/tools";
import { FinanceUIMessage } from "@/lib/types";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { createOllama, ollama } from "ollama-ai-provider-v2";
import { checkAnonymousRateLimit, incrementRateLimit } from "@/lib/rate-limit";
import { createClient } from '@supabase/supabase-js';
import { checkUserRateLimit } from '@/lib/rate-limit';
import { validateAccess } from '@/lib/polar-access-validation';
import { getPolarTrackedModel } from '@/lib/polar-llm-strategy';

// 13mins max streaming (vercel limit)
export const maxDuration = 800;

export async function POST(req: Request) {
  try {
    const { messages, sessionId }: { messages: FinanceUIMessage[], sessionId?: string } = await req.json();
    // console.log(
    //   "[Chat API] Incoming messages:",
    //   JSON.stringify(messages, null, 2)
    // );

    // Determine if this is a user-initiated message (should count towards rate limit)
    // ONLY increment for the very first user message in a conversation
    // All tool calls, continuations, and follow-ups should NOT increment
    const lastMessage = messages[messages.length - 1];
    const isUserMessage = lastMessage?.role === 'user';
    const userMessageCount = messages.filter(m => m.role === 'user').length;
    
    // Simple rule: Only increment if this is a user message AND it's the first user message
    const isUserInitiated = isUserMessage && userMessageCount === 1;
    
    console.log("[Chat API] Rate limit check:", {
      isUserMessage,
      userMessageCount,
      isUserInitiated,
      totalMessages: messages.length
    });

    // Get authenticated user using anon key
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') || '',
          },
        },
      }
    );

    // Create service role client for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user } } = await supabaseAnon.auth.getUser();
    
    // Check app mode and configure accordingly
    const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';
    console.log("[Chat API] App mode:", isDevelopment ? 'development' : 'production');
    console.log("[Chat API] Authenticated user:", user?.id || 'anonymous');

    // Validate access for authenticated users (simplified validation)
    if (user && !isDevelopment) {
      const accessValidation = await validateAccess(user.id);
      
      if (!accessValidation.hasAccess && accessValidation.requiresPaymentSetup) {
        console.log("[Chat API] Access validation failed - payment required");
        return new Response(
          JSON.stringify({
            error: "PAYMENT_REQUIRED",
            message: "Payment method setup required",
            tier: accessValidation.tier,
            action: "setup_payment"
          }),
          { status: 402, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      if (accessValidation.hasAccess) {
        console.log("[Chat API] Access validated for tier:", accessValidation.tier);
      }
    }

    // Check rate limit for user-initiated messages
    if (isUserInitiated && !isDevelopment) {
      if (!user) {
        // Fall back to anonymous rate limiting for non-authenticated users
        const rateLimitStatus = await checkAnonymousRateLimit();
        console.log("[Chat API] Anonymous rate limit status:", rateLimitStatus);
        
        if (!rateLimitStatus.allowed) {
          console.log("[Chat API] Anonymous rate limit exceeded");
          return new Response(
            JSON.stringify({
              error: "RATE_LIMIT_EXCEEDED",
              message: "You have exceeded your daily limit of 5 queries. Sign up to continue.",
              resetTime: rateLimitStatus.resetTime.toISOString(),
              remaining: rateLimitStatus.remaining,
            }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "X-RateLimit-Limit": rateLimitStatus.limit.toString(),
                "X-RateLimit-Remaining": rateLimitStatus.remaining.toString(),
                "X-RateLimit-Reset": rateLimitStatus.resetTime.toISOString(),
              },
            }
          );
        }
      } else {
        // Check user-based rate limits
        const rateLimitResult = await checkUserRateLimit(user.id);
        console.log("[Chat API] User rate limit status:", rateLimitResult);
        
        if (!rateLimitResult.allowed) {
          return new Response(JSON.stringify({
            error: "RATE_LIMIT_EXCEEDED",
            message: "Daily query limit reached. Upgrade to continue.",
            resetTime: rateLimitResult.resetTime.toISOString(),
            tier: rateLimitResult.tier
          }), {
            status: 429,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    } else if (isUserInitiated && isDevelopment) {
      console.log("[Chat API] Development mode: Rate limiting disabled");
    }

    // Detect available API keys and select provider/tools accordingly
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

    let selectedModel: any;
    let modelInfo: string;
    let supportsThinking = false;

    // Check if Ollama is enabled via header
    const ollamaEnabled = req.headers.get('x-ollama-enabled') !== 'false';

    // Models that support thinking/reasoning
    const thinkingModels = [
      'deepseek-r1', 'deepseek-v3', 'deepseek-v3.1',
      'qwen3', 'qwq',
      'phi4-reasoning', 'phi-4-reasoning',
      'cogito'
    ];

    if (isDevelopment && ollamaEnabled) {
      // Development mode: Try to use Ollama first, fallback to OpenAI
      try {
        // Try to connect to Ollama first
        const ollamaResponse = await fetch(`${ollamaBaseUrl}/api/tags`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000), // 3 second timeout
        });

        if (ollamaResponse.ok) {
          const data = await ollamaResponse.json();
          const models = data.models || [];

          if (models.length > 0) {
            // Prioritize reasoning models, then other capable models
            const preferredModels = [
              'deepseek-r1', 'qwen3', 'phi4-reasoning', 'cogito', // Reasoning models
              'llama3.1', 'gemma3:4b', 'gemma3', 'llama3.2', 'llama3', 'qwen2.5', 'codestral' // Regular models
            ];
            let selectedModelName = models[0].name;
            
            // Check if user has a specific model preference from the request
            const userPreferredModel = req.headers.get('x-ollama-model');

            // Try to find a preferred model
            if (userPreferredModel && models.some((m: any) => m.name === userPreferredModel)) {
              selectedModelName = userPreferredModel;
            } else {
              for (const preferred of preferredModels) {
                if (models.some((m: any) => m.name.includes(preferred))) {
                  selectedModelName = models.find((m: any) => m.name.includes(preferred))?.name;
                  break;
                }
              }
            }

            // Check if the selected model supports thinking
            supportsThinking = thinkingModels.some(thinkModel =>
              selectedModelName.toLowerCase().includes(thinkModel.toLowerCase())
            );

            // Debug: Log the exact configuration
            console.log(`[Chat API] Attempting to configure Ollama with baseURL: ${ollamaBaseUrl}/v1`);
            console.log(`[Chat API] Selected model name: ${selectedModelName}`);
            console.log(`[Chat API] Model supports thinking: ${supportsThinking}`);

            // Use OpenAI provider and explicitly create a chat model (not responses model)
            const ollamaAsOpenAI = createOpenAI({
              baseURL: `${ollamaBaseUrl}/v1`, // This should hit /v1/chat/completions
              apiKey: 'ollama', // Dummy API key for Ollama
            });

            // Create a chat model explicitly
            selectedModel = ollamaAsOpenAI.chat(selectedModelName);
            modelInfo = `Ollama (${selectedModelName})${supportsThinking ? ' [Reasoning]' : ''} - Development Mode`;
            console.log(`[Chat API] Created model with provider:`, typeof selectedModel);
            console.log(`[Chat API] Model baseURL should be: ${ollamaBaseUrl}/v1`);
          } else {
            throw new Error('No models available in Ollama');
          }
        } else {
          throw new Error(`Ollama API responded with status ${ollamaResponse.status}`);
        }
      } catch (error) {
        console.log("[Chat API] Ollama not available, falling back to OpenAI:", error);
        // Fallback to OpenAI in development mode
        selectedModel = hasOpenAIKey ? openai("gpt-5") : "openai/gpt-5";
        modelInfo = hasOpenAIKey 
          ? "OpenAI (gpt-5) - Development Mode Fallback" 
          : 'Vercel AI Gateway ("gpt-5") - Development Mode Fallback';
      }
    } else {
      // Production mode: Use Polar-wrapped OpenAI ONLY for pay-per-use users
      if (user) {
        // Get user subscription tier to determine billing approach
        const { data: userData } = await supabase
          .from('users')
          .select('subscription_tier, subscription_status')
          .eq('id', user.id)
          .single();
        
        const userTier = userData?.subscription_tier || 'free';
        const isActive = userData?.subscription_status === 'active';
        
        // Only use Polar LLM Strategy for pay-per-use users
        if (isActive && userTier === 'pay_per_use') {
          selectedModel = getPolarTrackedModel(user.id, "gpt-5");
          modelInfo = "OpenAI (gpt-5) - Production Mode (Polar Tracked - Pay-per-use)";
        } else {
          // Unlimited users and free users use regular model (no per-token billing)
          selectedModel = hasOpenAIKey ? openai("gpt-5") : "openai/gpt-5";
          modelInfo = hasOpenAIKey
            ? `OpenAI (gpt-5) - Production Mode (${userTier} tier - Flat Rate)`
            : `Vercel AI Gateway ("gpt-5") - Production Mode (${userTier} tier - Flat Rate)`;
        }
      } else {
        selectedModel = hasOpenAIKey ? openai("gpt-5") : "openai/gpt-5";
        modelInfo = hasOpenAIKey
          ? "OpenAI (gpt-5) - Production Mode (Anonymous)"
          : 'Vercel AI Gateway ("gpt-5") - Production Mode (Anonymous)';
      }
    }

    console.log("[Chat API] Model selected:", modelInfo);

    // No need for usage tracker - Polar LLM Strategy handles everything automatically

    // User tier is already determined above in model selection
    let userTier = 'free';
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();
      userTier = userData?.subscription_tier || 'free';
      console.log("[Chat API] User tier:", userTier);
    }

    // Track processing start time
    const processingStartTime = Date.now();

    // Note: We don't save individual messages here anymore.
    // The entire conversation is saved in onFinish callback after streaming completes.
    // This follows the Vercel AI SDK v5 recommended pattern.

    console.log(`[Chat API] About to call streamText with model:`, selectedModel);
    console.log(`[Chat API] Model info:`, modelInfo);

    // Build provider options conditionally based on whether we're using Ollama
    const isUsingOllama = isDevelopment && ollamaEnabled && modelInfo.includes('Ollama');
    const providerOptions: any = {};

    if (isUsingOllama) {
      // For Ollama models using OpenAI compatibility layer
      // We need to use the openai provider options since createOpenAI is used
      if (supportsThinking) {
        // Enable thinking for reasoning models
        providerOptions.openai = {
          think: true
        };
        console.log('[Chat API] Enabled thinking mode for Ollama reasoning model');
      } else {
        // Explicitly disable thinking for non-reasoning models
        providerOptions.openai = {
          think: false
        };
        console.log('[Chat API] Disabled thinking mode for Ollama non-reasoning model');
      }
    } else {
      // OpenAI-specific options (only when using OpenAI)
      providerOptions.openai = {
        store: true,
        reasoningEffort: 'medium',
        reasoningSummary: 'auto',
        include: ['reasoning.encrypted_content'],
      };
    }

    const result = streamText({
      model: selectedModel as any,
      messages: convertToModelMessages(messages),
      tools: financeTools,
      toolChoice: "auto",
      experimental_context: {
        userId: user?.id,
        userTier,
        sessionId,
      },
      providerOptions,
      system: `You are a helpful assistant with access to comprehensive tools for Python code execution, financial data, web search, academic research, and data visualization.
      
      CRITICAL CITATION INSTRUCTIONS:
      When you use ANY search tool (financial, web, or Wiley academic search) and reference information from the results in your response:
      
      1. **Citation Format**: Use square brackets [1], [2], [3], etc.
      2. **Citation Placement**: Place citations at the END of each sentence or paragraph where you reference the information
      3. **Multiple Citations**: When multiple sources support the same statement, group them together: [1][2][3] or [1,2,3]
      4. **Sequential Numbering**: Number citations sequentially starting from [1] based on the order sources appear in your search results
      5. **Consistent References**: The same source always gets the same number throughout your response
      
      CITATION PLACEMENT RULES:
      - Place citations at the END of the sentence before the period: "Tesla's revenue grew 50% in Q3 2023 [1]."
      - For paragraphs with multiple facts from the same source, cite at the end of each fact or at paragraph end
      - Group multiple citations together when they support the same claim: "Multiple analysts confirm strong growth [1][2][3]."
      - For lists, place citations after each item if from different sources
      
      Example of PROPER citation usage:
      "Tesla reported revenue of $24.9 billion in Q3 2023, representing a 50% year-over-year increase [1]. The company's automotive gross margin reached 19.3%, exceeding analyst expectations [1][2]. Energy storage deployments surged 90% compared to the previous year [3]. These results demonstrate Tesla's strong operational performance across multiple business segments [1][2][3]."
      
      You can:
         
         - Execute Python code for financial modeling, complex calculations, data analysis, and mathematical computations using the codeExecution tool (runs in a secure Daytona Sandbox)
         - The Python environment can install packages via pip at runtime inside the sandbox (e.g., numpy, pandas, scikit-learn)
         - Visualization libraries (matplotlib, seaborn, plotly) may work inside Daytona. However, by default, prefer the built-in chart creation tool for standard time series and comparisons. Use Daytona for advanced or custom visualizations only when necessary.
         - Search for real-time financial data using the financial search tool (market data, earnings reports, SEC filings, financial news, regulatory updates)
         - Search academic finance literature using the Wiley search tool (peer-reviewed papers, academic journals, textbooks, and scholarly research)
         - Search the web for general information using the web search tool (any topic with relevance scoring and cost control)
         - Create interactive charts and visualizations using the chart creation tool:
           • Line charts: Time series trends (stock prices, revenue over time)
           • Bar charts: Categorical comparisons (quarterly earnings, company comparisons)
           • Area charts: Cumulative data (stacked metrics, composition)
           • Scatter/Bubble charts: Correlation analysis, positioning maps, investor mapping
           • Quadrant charts: 2x2 strategic matrices (BCG matrix, Edge Zone analysis)

      **CRITICAL NOTE**: You must only make max 5 parallel tool calls at a time.

      **CRITICAL INSTRUCTIONS**: Your reports must be incredibly thorough and detailed, explore everything that is relevant to the user's query that will help to provide
      the perfect response that is of a level expected of a elite level professional financial analyst for the leading financial research firm in the world.
      
      For financial data searches, you can access:
      • Real-time stock prices, crypto rates, and forex data
      • Quarterly and annual earnings reports
      • SEC filings (10-K, 10-Q, 8-K documents)  
      • Financial news from Bloomberg, Reuters, WSJ
      • Regulatory updates from SEC, Federal Reserve
      • Market intelligence and insider trading data
      
      For Wiley academic searches, you can access:
      • Peer-reviewed finance and economics journals
      • Academic textbooks and scholarly publications
      • Quantitative finance research papers
      • Advanced financial modeling methodologies
      • Academic studies on options pricing, derivatives, risk management
      • Theoretical finance concepts and mathematical frameworks
      
               For web searches, you can find information on:
         • Current events and news from any topic
         • Research topics with high relevance scoring
         • Educational content and explanations
         • Technology trends and developments
         • General knowledge across all domains
         
         For data visualization, you can create charts when users want to:
         • Compare multiple stocks, cryptocurrencies, or financial metrics (line/bar charts)
         • Visualize historical trends over time (line/area charts for stock prices, revenue)
         • Display portfolio performance or asset allocation (area charts)
         • Show relationships between different data series (scatter charts for correlation)
         • Map strategic positioning (scatter charts for investor mapping, competitive analysis)
         • Create 2x2 strategic matrices (quadrant charts for BCG, Edge Zone frameworks)
         • Present financial data in an easy-to-understand visual format

         **Chart Type Selection Guidelines**:
         • Use LINE charts for time series trends (simple closing prices, revenue over time, basic metrics)
         • Use BAR charts for categorical comparisons (quarterly earnings, company comparisons)
         • Use AREA charts for cumulative data (stacked metrics, composition analysis)
         • Use SCATTER charts for correlation, positioning maps, or bubble charts with size representing a third metric
         • Use QUADRANT charts for 2x2 strategic analysis (divides chart into 4 quadrants with reference lines)

         Whenever you have time series data for the user (such as stock prices, historical financial metrics, or any data with values over time), always visualize it using the chart creation tool. For scatter/quadrant charts, each series represents a category (for color coding), and each data point represents an individual entity with x, y, optional size (for bubbles), and optional label (entity name).

         CRITICAL: When using the createChart tool, you MUST format the dataSeries exactly like this:
         dataSeries: [
           {
             name: "Apple (AAPL)",
             data: [
               {x: "2024-01-01", y: 150.25},
               {x: "2024-02-01", y: 155.80},
               {x: "2024-03-01", y: 162.45}
             ]
           }
         ]
         
         Each data point requires an x field (date/label) and y field (numeric value). Do NOT use other formats like "datasets" or "labels" - only use the dataSeries format shown above.

         CRITICAL CHART EMBEDDING REQUIREMENTS:
         - Charts are automatically displayed in the Action Tracker section when created
         - Charts are ALSO saved to the database and MUST be referenced in your markdown response
         - The createChart tool returns a chartId and imageUrl for every chart created
         - YOU MUST ALWAYS embed charts in your response using markdown image syntax: ![Chart Title](/api/charts/{chartId}/image)
         - Embed charts at appropriate locations within your response, just like a professional investment banking report
         - Place charts AFTER the relevant analysis section that discusses the data shown in the chart
         - Charts should enhance and support your written analysis - they are not optional
         - Professional reports always integrate visual data with written analysis

         Example of proper chart embedding in a response:
         "Tesla's revenue has shown exceptional growth over the past five years, driven by increasing vehicle deliveries and expanding energy storage operations. The company's automotive segment remains the primary revenue driver, while energy generation and storage continue to gain momentum.

         ![Tesla Revenue Growth 2019-2024](/api/charts/abc-123-def/image)

         This growth trajectory demonstrates Tesla's successful execution of its production scaling strategy..."

         When creating charts:
         • Use line charts for time series data (stock prices, trends over time)
         • Use bar charts for comparisons between categories (quarterly earnings, different stocks)
         • Use area charts for cumulative data or when showing composition
         • Always provide meaningful titles and axis labels
         • Support multiple data series when comparing related metrics
         • Colors are automatically assigned - focus on data structure and meaningful labels

               Always use the appropriate tools when users ask for calculations, Python code execution, financial information, web queries, or data visualization.
         Choose the codeExecution tool for any mathematical calculations, financial modeling, data analysis, statistical computations, or when users need to run Python code.
         
         CRITICAL: WHEN TO USE codeExecution TOOL:
         - ALWAYS use codeExecution when the user asks you to "calculate", "compute", "use Python", or "show Python code"
         - NEVER just display Python code as text - you MUST execute it using the codeExecution tool
         - If the user asks for calculations with Python, USE THE TOOL, don't just show code
         - Mathematical formulas should be explained with LaTeX, but calculations MUST use codeExecution
         
         CRITICAL PYTHON CODE REQUIREMENTS:
         1. ALWAYS include print() statements - Python code without print() produces no visible output
         2. Use descriptive labels and proper formatting in your print statements
         3. Include units, currency symbols, percentages where appropriate
         4. Show step-by-step calculations for complex problems
         5. Use f-string formatting for professional output
         6. Always calculate intermediate values before printing final results
          7. Available libraries: You may install and use packages in the Daytona sandbox (e.g., numpy, pandas, scikit-learn). Prefer the chart creation tool for visuals unless an advanced/custom visualization is required.
          8. Visualization guidance: Prefer the chart creation tool for most charts. Use Daytona-rendered plots only for complex, bespoke visualizations that the chart tool cannot represent.
         
          REQUIRED: Every Python script must end with print() statements that show the calculated results with proper labels, units, and formatting. Never just write variable names or expressions without print() - they will not display anything to the user.
          If generating advanced charts with Daytona (e.g., matplotlib), ensure the code renders the figure (e.g., plt.show()) so artifacts can be captured.
         
         ERROR RECOVERY: If any tool call fails due to validation errors, you will receive an error message explaining what went wrong. When this happens:
         1. Read the error message carefully to understand what fields are missing or incorrect
         2. Correct the tool call by providing ALL required fields with proper values
         3. For createChart errors, ensure you provide: title, type, xAxisLabel, yAxisLabel, and dataSeries
         4. For codeExecution tool errors, ensure your code includes proper print() statements
         5. Try the corrected tool call immediately - don't ask the user for clarification
         6. If multiple fields are missing, fix ALL of them in your retry attempt
         
                  When explaining mathematical concepts, formulas, or financial calculations, ALWAYS use LaTeX notation for clear mathematical expressions:
         
         CRITICAL: ALWAYS wrap ALL mathematical expressions in <math>...</math> tags:
         - For inline math: <math>FV = P(1 + r)^t</math>
         - For fractions: <math>\frac{r}{n} = \frac{0.07}{12}</math>
         - For exponents: <math>(1 + r)^{nt}</math>
         - For complex formulas: <math>FV = P \times \left(1 + \frac{r}{n}\right)^{nt}</math>
         
         NEVER write LaTeX code directly in text like \frac{r}{n} or \times - it must be inside <math> tags.
         NEVER use $ or $$ delimiters - only use <math>...</math> tags.
         This makes financial formulas much more readable and professional.
         Choose the financial search tool specifically for financial markets, companies, and economic data.
         Choose the Wiley search tool for academic finance research, peer-reviewed studies, theoretical concepts, advanced quantitative methods, options pricing models, academic textbooks, and scholarly papers.
         Choose the web search tool for general topics, current events, research, and non-financial information.
         Choose the chart creation tool when users want to visualize data, compare metrics, or see trends over time.

         When users ask for charts or data visualization, or when you have time series data:
         1. First gather the necessary data (using financial search or web search if needed)
         2. Then create an appropriate chart with that data (always visualize time series data)
         3. Ensure the chart has a clear title, proper axis labels, and meaningful data series names
         4. Colors are automatically assigned for optimal visual distinction

      Important: If you use the chart creation tool to plot a chart, do NOT add a link to the chart in your response. The chart will be rendered automatically for the user. Simply explain the chart and its insights, but do not include any hyperlinks or references to a chart link.

      When making multiple tool calls in parallel to retrieve time series data (for example, comparing several stocks or metrics), always specify the same time periods and date ranges for each tool call. This ensures the resulting data is directly comparable and can be visualized accurately on the same chart. If the user does not specify a date range, choose a reasonable default (such as the past year) and use it consistently across all tool calls for time series data.

      Provide clear explanations and context for all information. Offer practical advice when relevant.
      Be encouraging and supportive while helping users find accurate, up-to-date information.

      ---
      CRITICAL AGENT BEHAVIOR:
      - After every reasoning step, you must either call a tool or provide a final answer. Never stop after reasoning alone.
      - If you realize you need to correct a previous tool call, immediately issue the correct tool call.
      - If the user asks for multiple items (e.g., multiple companies), you must call the tool for each and only finish when all are processed and summarized.
      - Always continue until you have completed all required tool calls and provided a summary or visualization if appropriate.
      - NEVER just show Python code as text - if the user wants calculations or Python code, you MUST use the codeExecution tool to run it
      - When users say "calculate", "compute", or mention Python code, this is a COMMAND to use the codeExecution tool, not a request to see code
      - NEVER suggest using Python to fetch data from the internet or APIs. All data retrieval must be done via the financialSearch or webSearch tools.
      - Remember: The Python environment runs in the cloud with NumPy, pandas, and scikit-learn available, but NO visualization libraries.
      
      CRITICAL WORKFLOW ORDER:
      1. First: Complete ALL data gathering (searches, calculations, etc.)
      2. Then: Create ALL charts/visualizations based on the gathered data
      3. Finally: Present your final formatted response with analysis
      
      This ensures charts appear immediately before your analysis and are not lost among tool calls.
      ---

      ---
      FINAL RESPONSE FORMATTING GUIDELINES:
      When presenting your final response to the user, you MUST format the information in an extremely well-organized and visually appealing way:

      1. **Use Rich Markdown Formatting:**
         - Use tables for comparative data, financial metrics, and any structured information
         - Use bullet points and numbered lists appropriately
         - Use **bold** for key metrics and important values
         - Use headers (##, ###) to organize sections clearly
         - Use blockquotes (>) for key insights or summaries

      2. **Tables for Financial Data:**
         - Present earnings, revenue, cash flow, and balance sheet data in markdown tables
         - Format numbers with proper comma separators (e.g., $1,234,567)
         - Include percentage changes and comparisons
         - Example:
         | Metric | 2020 | 2021 | Change (%) |
         |--------|------|------|------------|
         | Revenue | $41.9B | $81.3B | +94.0% |
         | EPS | $2.22 | $6.45 | +190.5% |

      3. **Mathematical Formulas:**
         - Always use <math> tags for any mathematical expressions
         - Present financial calculations clearly with proper notation

      4. **Data Organization:**
         - Group related information together
         - Use clear section headers
         - Provide executive summaries at the beginning
         - Include key takeaways at the end

      5. **Chart Placement:**
         - Create ALL charts IMMEDIATELY BEFORE your final response text
         - First complete all data gathering and analysis tool calls
         - Then create all necessary charts
         - Finally present your comprehensive analysis with references to the charts
         - This ensures charts are visible and not buried among tool calls

      6. **Visual Hierarchy:**
         - Start with a brief executive summary
         - Present detailed findings in organized sections
         - Use horizontal rules (---) to separate major sections
         - End with key takeaways and visual charts

      7. **Code Display Guidelines:**
         - DO NOT repeat Python code in your final response if you've already executed it with the codeExecution tool
         - The executed code and its output are already displayed in the tool result box
         - Only show code snippets in your final response if:
           a) You're explaining a concept that wasn't executed
           b) The user specifically asks to see the code again
           c) You're showing an alternative approach
         - Reference the executed results instead of repeating the code

      Remember: The goal is to present ALL retrieved data and facts in the most professional, readable, and visually appealing format possible. Think of it as creating a professional financial report or analyst presentation.
      
      8. **Citation Requirements:**
         - ALWAYS cite sources when using information from search results
         - Place citations [1], [2], etc. at the END of sentences or paragraphs
         - Group multiple citations together when they support the same point: [1][2][3]
         - Maintain consistent numbering throughout your response
         - Each unique search result gets ONE citation number used consistently
         - Citations are MANDATORY for:
           • Specific numbers, statistics, percentages
           • Company financials and metrics  
           • Quotes or paraphrased statements
           • Market data and trends
           • Any factual claims from search results
      ---
      `,
    });

    // Log streamText result object type
    console.log("[Chat API] streamText result type:", typeof result);
    console.log("[Chat API] streamText result:", result);

    // Create the streaming response with chat persistence
    const streamResponse = result.toUIMessageStreamResponse({
      sendReasoning: true,
      originalMessages: messages,
      onFinish: async ({ messages: allMessages }) => {
        // Calculate processing time
        const processingEndTime = Date.now();
        const processingTimeMs = processingEndTime - processingStartTime;
        console.log('[Chat API] Processing completed in', processingTimeMs, 'ms');

        // Save all messages to database
        console.log('[Chat API] onFinish called - user:', !!user, 'sessionId:', sessionId);
        console.log('[Chat API] Total messages in conversation:', allMessages.length);

        if (user && sessionId) {
          console.log('[Chat API] Saving messages to session:', sessionId);

          // The correct pattern: Save ALL messages from the conversation
          // This replaces all messages in the session with the complete, up-to-date conversation
          await saveMessagesToSession(supabase, sessionId, allMessages, processingTimeMs);
        }

        // No manual usage tracking needed - Polar LLM Strategy handles this automatically!
        console.log('[Chat API] AI usage automatically tracked by Polar LLM Strategy');
      }
    });

    // Increment rate limit after successful validation but before processing
    if (isUserInitiated && !isDevelopment) {
      console.log("[Chat API] Incrementing rate limit for user-initiated message");
      try {
        if (user) {
          // Only increment server-side for authenticated users
          const rateLimitResult = await incrementRateLimit(user.id);
          console.log("[Chat API] Authenticated user rate limit incremented:", rateLimitResult);
        } else {
          // Anonymous users handle increment client-side via useRateLimit hook
          console.log("[Chat API] Skipping server-side increment for anonymous user (handled client-side)");
        }
      } catch (error) {
        console.error("[Chat API] Failed to increment rate limit:", error);
        // Continue with processing even if increment fails
      }
    }
    
    if (isDevelopment) {
      // Add development mode headers
      streamResponse.headers.set("X-Development-Mode", "true");
      streamResponse.headers.set("X-RateLimit-Limit", "unlimited");
      streamResponse.headers.set("X-RateLimit-Remaining", "unlimited");
    }

    return streamResponse;
  } catch (error) {
    console.error("[Chat API] Error:", error);

    // Extract meaningful error message
    const errorMessage = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'An unexpected error occurred';

    // Check if it's a tool/function calling compatibility error
    const isToolError = errorMessage.toLowerCase().includes('tool') ||
                       errorMessage.toLowerCase().includes('function');
    const isThinkingError = errorMessage.toLowerCase().includes('thinking');

    // Log full error details for debugging
    console.error("[Chat API] Error details:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      error: error,
      isToolError,
      isThinkingError
    });

    // Return specific error codes for compatibility issues
    if (isToolError || isThinkingError) {
      return new Response(
        JSON.stringify({
          error: "MODEL_COMPATIBILITY_ERROR",
          message: errorMessage,
          compatibilityIssue: isToolError ? "tools" : "thinking"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: "CHAT_ERROR",
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function saveMessagesToSession(
  supabase: any,
  sessionId: string,
  messages: any[],
  processingTimeMs?: number
) {
  try {
    console.log('[saveMessagesToSession] Saving', messages.length, 'messages for session:', sessionId);

    // Delete all existing messages for this session first
    const { error: deleteError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('session_id', sessionId);

    if (deleteError) {
      console.error('[saveMessagesToSession] Error deleting old messages:', deleteError);
      return;
    }

    // Prepare all messages for insertion
    const messagesToInsert = messages.map((message, index) => {
      // AI SDK v5 uses 'parts' array for UIMessage
      // Store it in the 'content' JSONB column in database
      let partsToSave = [];

      if (message.parts && Array.isArray(message.parts)) {
        partsToSave = message.parts;
      } else if (message.content) {
        // Fallback for older format
        if (typeof message.content === 'string') {
          partsToSave = [{ type: 'text', text: message.content }];
        } else if (Array.isArray(message.content)) {
          partsToSave = message.content;
        }
      }

      const messageData: any = {
        session_id: sessionId,
        role: message.role,
        content: partsToSave, // Store parts array in content column
        created_at: message.createdAt || new Date().toISOString(),
      };

      // Add processing time to the last assistant message (the new one)
      if (
        message.role === 'assistant' &&
        index === messages.length - 1 &&
        processingTimeMs !== undefined
      ) {
        messageData.processing_time_ms = processingTimeMs;
      }

      return messageData;
    });

    console.log('[saveMessagesToSession] Inserting', messagesToInsert.length, 'messages');
    console.log('[saveMessagesToSession] Message roles:', messagesToInsert.map(m => m.role).join(', '));

    // Insert all messages in a single operation
    const { error: insertError } = await supabase
      .from('chat_messages')
      .insert(messagesToInsert);

    if (insertError) {
      console.error('[saveMessagesToSession] Database insert error:', insertError);
    } else {
      console.log('[saveMessagesToSession] Successfully saved all messages');
    }
  } catch (error) {
    console.error('[saveMessagesToSession] Exception:', error);
  }
}
