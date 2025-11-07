import { NextRequest, NextResponse } from 'next/server';
import puppeteer, { Browser } from 'puppeteer';
import { createClient } from '@/utils/supabase/server';
import { buildPdfHtmlTemplate } from '@/lib/pdf-utils';
import { cleanFinancialText, preprocessMarkdownText } from '@/lib/markdown-utils';
import { Citation } from '@/lib/citation-utils';
import * as fs from 'fs';
import * as path from 'path';

// Allow longer execution time for PDF generation
export const maxDuration = 300; // 5 minutes

/**
 * POST /api/reports/generate-pdf
 * Generate professional PDF from chat session with embedded charts and citations
 *
 * Request body: { sessionId: string }
 * Response: PDF file download
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log('[PDF Generation] Starting PDF generation for session:', sessionId);

    const supabase = await createClient();

    // Step 1: Fetch session and messages
    const { data: sessionData, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('title')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      console.error('[PDF Generation] Session not found:', sessionError);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('[PDF Generation] Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages found in session' },
        { status: 404 }
      );
    }

    console.log('[PDF Generation] Found', messages.length, 'messages');

    // Step 2: Extract markdown content from assistant messages only
    const assistantMessages = messages.filter((m: any) => m.role === 'assistant');
    let markdownContent = '';
    const citations: Citation[] = [];
    let citationNumber = 1;
    let totalProcessingTimeMs = 0;

    for (const message of assistantMessages) {
      const content = message.content;
      if (!content || !Array.isArray(content)) continue;

      // Accumulate processing time from assistant messages
      if (message.processing_time_ms) {
        totalProcessingTimeMs += message.processing_time_ms;
      }

      for (const part of content) {
        if (part.type === 'text' && part.text) {
          markdownContent += part.text + '\n\n';
        }
        // Extract citations from tool results
        else if (part.type === 'tool-result' && part.result) {
          try {
            const result = typeof part.result === 'string' ? JSON.parse(part.result) : part.result;
            if (result.results && Array.isArray(result.results)) {
              for (const item of result.results) {
                citations.push({
                  number: citationNumber.toString(),
                  title: item.title || `Source ${citationNumber}`,
                  url: item.url || '',
                  description: item.content || item.summary || item.description,
                  source: item.source,
                  date: item.date,
                  authors: Array.isArray(item.authors) ? item.authors : undefined,
                  doi: item.doi,
                  relevanceScore: item.relevanceScore || item.relevance_score,
                  toolType: getToolType(part.toolName),
                });
                citationNumber++;
              }
            }
          } catch (error) {
            // Ignore parsing errors
          }
        }
      }
    }

    console.log('[PDF Generation] Extracted content length:', markdownContent.length);
    console.log('[PDF Generation] Found', citations.length, 'citations');
    console.log('[PDF Generation] Total processing time:', totalProcessingTimeMs, 'ms');

    // Step 3: Extract chart IDs from markdown
    const chartPattern = /!\[.*?\]\(\/api\/charts\/([^\/]+)\/image\)/g;
    const chartIds: string[] = [];
    let match;

    while ((match = chartPattern.exec(markdownContent)) !== null) {
      chartIds.push(match[1]);
    }

    console.log('[PDF Generation] Found', chartIds.length, 'charts to render');

    // Step 4: Preprocess markdown
    const processedMarkdown = preprocessMarkdownText(cleanFinancialText(markdownContent));

    // Replace chart markdown with placeholders
    let markdownWithPlaceholders = processedMarkdown;
    chartIds.forEach(chartId => {
      const chartMarkdown = `![.*?](/api/charts/${chartId}/image)`;
      markdownWithPlaceholders = markdownWithPlaceholders.replace(
        new RegExp(chartMarkdown, 'g'),
        `__CHART_${chartId}__`
      );
    });

    // Step 5: Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });

    console.log('[PDF Generation] Puppeteer browser launched');

    try {
      // Step 6: Render charts as images (in parallel)
      const chartImagesMap = new Map<string, string>();

      if (chartIds.length > 0) {
        console.log('[PDF Generation] Rendering charts...');
        const chartPromises = chartIds.map(chartId => renderChartAsImage(browser, chartId));
        const chartImages = await Promise.all(chartPromises);

        chartIds.forEach((chartId, index) => {
          chartImagesMap.set(chartId, chartImages[index]);
        });

        console.log('[PDF Generation] All charts rendered successfully');
      }

      // Step 7: Build HTML template with logo
      const logoPath = path.join(process.cwd(), 'public', 'valyu.svg');
      const logoSvg = fs.readFileSync(logoPath, 'utf-8');
      const logoBase64 = Buffer.from(logoSvg).toString('base64');
      const logoDataUrl = `data:image/svg+xml;base64,${logoBase64}`;

      const htmlContent = buildPdfHtmlTemplate({
        title: sessionData.title || 'Financial Analysis Report',
        content: markdownWithPlaceholders,
        citations: citations,
        logoDataUrl: logoDataUrl,
        chartImages: chartImagesMap,
        processingTimeMs: totalProcessingTimeMs,
      });

      // Step 8: Generate PDF
      console.log('[PDF Generation] Generating PDF...');
      const page = await browser.newPage();
      await page.emulateMediaType('print');
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      // Wait for fonts and images to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '2cm',
          bottom: '3cm',
        },
        displayHeaderFooter: true,
        footerTemplate: `
          <div style="font-size: 9px; color: #6b7280; text-align: center; width: 100%; padding-top: 10px; border-top: 1px solid #e5e7eb;">
            <span style="margin-right: 20px;">Valyu</span>
            <span style="margin-right: 20px;">CONFIDENTIAL</span>
            <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `,
      });

      await page.close();

      console.log('[PDF Generation] PDF generated successfully');

      // Step 9: Return PDF
      const fileName = sanitizeFileName(sessionData.title || 'report');

      return new NextResponse(Buffer.from(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}.pdf"`,
        },
      });

    } finally {
      await browser.close();
      console.log('[PDF Generation] Browser closed');
    }

  } catch (error: any) {
    console.error('[PDF Generation] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Render a chart as a high-resolution PNG image using Puppeteer
 */
async function renderChartAsImage(
  browser: Browser,
  chartId: string
): Promise<string> {
  console.log('[PDF Generation] Rendering chart:', chartId);

  const supabase = await createClient();

  // Fetch chart data
  const { data: chartData, error } = await supabase
    .from('charts')
    .select('chart_data')
    .eq('id', chartId)
    .single();

  if (error || !chartData) {
    console.error('[PDF Generation] Chart not found:', chartId, error);
    throw new Error(`Chart not found: ${chartId}`);
  }

  // Parse chart data
  const parsedChartData = typeof chartData.chart_data === 'string'
    ? JSON.parse(chartData.chart_data)
    : chartData.chart_data;

  // Generate HTML with chart (using FinancialChart component styling)
  const chartHtml = createChartComponentHtml(parsedChartData);

  // Create new page
  const page = await browser.newPage();

  try {
    // Set viewport for high-DPI rendering
    await page.setViewport({
      width: 1300,
      height: 700,
      deviceScaleFactor: 2, // 2x resolution for high quality
    });

    // Load HTML
    await page.setContent(chartHtml, { waitUntil: 'networkidle0' });

    // Wait for chart to render
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Find chart wrapper element
    const element = await page.$('.chart-wrapper');

    if (!element) {
      throw new Error('Chart wrapper not found');
    }

    // Take screenshot
    const screenshot = await element.screenshot({
      type: 'png',
      omitBackground: false,
    });

    // Convert to base64
    const base64 = Buffer.from(screenshot).toString('base64');

    return base64;
  } finally {
    await page.close();
  }
}

/**
 * Create HTML for standalone chart rendering
 * This mimics the FinancialChart component but as static HTML/CSS
 */
function createChartComponentHtml(chartData: any): string {
  // Read logo
  const logoPath = path.join(process.cwd(), 'public', 'valyu.svg');
  const logoSvg = fs.readFileSync(logoPath, 'utf-8');

  // Generate SVG chart (simplified version - you may want to enhance this)
  const svg = generateSVGChart(chartData);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #1f2937 0%, #111827 50%, #1f2937 100%);
          padding: 40px;
        }
        .chart-wrapper {
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 2px solid #e5e7eb;
        }
        .title-section {
          flex: 1;
        }
        .title {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 8px;
        }
        .description {
          font-size: 14px;
          color: #6b7280;
          line-height: 1.5;
        }
        .logo-box {
          width: 180px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9fafb;
          border-radius: 8px;
          padding: 12px;
        }
        .logo-box svg {
          max-width: 100%;
          max-height: 100%;
        }
        .chart-content {
          background: white;
          border-radius: 8px;
        }
      </style>
    </head>
    <body>
      <div class="chart-wrapper">
        <div class="header">
          <div class="title-section">
            <div class="title">${chartData.title}</div>
            <div class="description">${chartData.description || ''}</div>
          </div>
          <div class="logo-box">
            ${logoSvg}
          </div>
        </div>
        <div class="chart-content">
          ${svg}
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate basic SVG chart
 * Note: This is a simplified version. For production, you'd want to use a proper charting library
 * or render the actual React component with chart data
 */
function generateSVGChart(chartData: any): string {
  // This is a placeholder - in production you'd want to:
  // 1. Use the actual Recharts library server-side
  // 2. Or generate SVG manually based on chart type
  // 3. Or use a headless chart rendering service

  // For now, return a simple placeholder that shows we attempted to render
  return `
    <svg width="1200" height="500" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="500" fill="#f9fafb" />
      <text x="600" y="250" text-anchor="middle" font-family="Arial" font-size="20" fill="#6b7280">
        Chart: ${chartData.title}
      </text>
      <text x="600" y="280" text-anchor="middle" font-family="Arial" font-size="14" fill="#9ca3af">
        ${chartData.chartType || chartData.type} chart with ${chartData.dataSeries?.length || 0} series
      </text>
    </svg>
  `;
}

/**
 * Sanitize filename for download
 */
function sanitizeFileName(title: string): string {
  return title
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .substring(0, 50);
}

/**
 * Get tool type from tool name
 */
function getToolType(toolName?: string): 'financial' | 'web' | 'wiley' | undefined {
  if (!toolName) return undefined;

  const name = toolName.toLowerCase();
  if (name.includes('financial')) return 'financial';
  if (name.includes('wiley')) return 'wiley';
  if (name.includes('web')) return 'web';

  return undefined;
}
