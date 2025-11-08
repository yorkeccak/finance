import { NextRequest, NextResponse } from 'next/server';
import puppeteer, { Browser } from 'puppeteer';
import { createClient } from '@/utils/supabase/server';
import { buildPdfHtmlTemplate } from '@/lib/pdf-utils';
import { cleanFinancialText, preprocessMarkdownText } from '@/lib/markdown-utils';
import { Citation } from '@/lib/citation-utils';
import { csvToMarkdownTable, formatCsvForMarkdown, CSVData } from '@/lib/csv-utils';
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

    // Step 3: Extract chart IDs and CSV IDs from markdown
    const chartPattern = /!\[.*?\]\(\/api\/charts\/([^\/]+)\/image\)/g;
    const chartIds: string[] = [];
    let match;

    while ((match = chartPattern.exec(markdownContent)) !== null) {
      chartIds.push(match[1]);
    }

    // Extract CSV IDs
    const csvPattern = /!\[.*?\]\((csv:([a-f0-9-]+)|\/api\/csvs\/([a-f0-9-]+))\)/g;
    const csvIds: string[] = [];
    while ((match = csvPattern.exec(markdownContent)) !== null) {
      const csvId = match[2] || match[3]; // Get ID from either csv:uuid or /api/csvs/uuid format
      if (csvId) csvIds.push(csvId);
    }

    console.log('[PDF Generation] Found', chartIds.length, 'charts to render');
    console.log('[PDF Generation] Found', csvIds.length, 'CSV tables to render');

    // Step 4: Preprocess markdown
    const processedMarkdown = preprocessMarkdownText(cleanFinancialText(markdownContent));

    // Replace chart markdown with placeholders
    let markdownWithPlaceholders = processedMarkdown;
    chartIds.forEach(chartId => {
      // Escape special regex characters in the URL and match any text in the alt text
      const chartMarkdown = `!\\[.*?\\]\\(\\/api\\/charts\\/${chartId}\\/image\\)`;
      markdownWithPlaceholders = markdownWithPlaceholders.replace(
        new RegExp(chartMarkdown, 'g'),
        `__CHART_${chartId}__`
      );
    });

    // Replace CSV markdown with placeholders
    csvIds.forEach(csvId => {
      const csvMarkdownPattern = `!\\[.*?\\]\\((csv:${csvId}|\\/api\\/csvs\\/${csvId})\\)`;
      markdownWithPlaceholders = markdownWithPlaceholders.replace(
        new RegExp(csvMarkdownPattern, 'g'),
        `__CSV_${csvId}__`
      );
    });

    // Fetch CSV data and convert to markdown tables
    const csvMarkdownMap = new Map<string, string>();
    for (const csvId of csvIds) {
      const { data: csvData, error } = await supabase
        .from('csvs')
        .select('*')
        .eq('id', csvId)
        .single();

      if (!error && csvData) {
        // Parse rows if they're stored as JSON string
        let parsedRows = csvData.rows;
        if (typeof csvData.rows === 'string') {
          try {
            parsedRows = JSON.parse(csvData.rows);
          } catch (e) {
            console.error('[PDF Generation] Failed to parse CSV rows:', e);
            continue;
          }
        }

        // Create CSV data object
        const csvDataObj: CSVData = {
          title: csvData.title || 'Table',
          description: csvData.description,
          headers: csvData.headers || [],
          rows: parsedRows || [],
        };

        // Format and convert to markdown table (same as chat interface)
        const formattedCsvData = formatCsvForMarkdown(csvDataObj);
        const markdownTable = csvToMarkdownTable(formattedCsvData);
        csvMarkdownMap.set(csvId, markdownTable);
      }
    }

    console.log('[PDF Generation] Converted', csvMarkdownMap.size, 'CSV tables to markdown');

    // Step 5: Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });

    console.log('[PDF Generation] Puppeteer browser launched');

    try {
      // Step 6: Render charts as images (in parallel)
      const chartImagesMap = new Map<string, string>();

      if (chartIds.length > 0) {
        console.log('[PDF Generation] Rendering', chartIds.length, 'charts...');
        const chartPromises = chartIds.map(chartId => renderChartAsImage(browser, chartId));
        const chartImages = await Promise.all(chartPromises);

        chartIds.forEach((chartId, index) => {
          if (chartImages[index]) {
            chartImagesMap.set(chartId, chartImages[index]);
          }
        });

        console.log('[PDF Generation] Charts rendered:', chartImagesMap.size, '/', chartIds.length);
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
        csvMarkdown: csvMarkdownMap,
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
 * by navigating to a standalone HTML page with the chart
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
    console.error('[PDF Generation] Chart not found:', chartId);
    console.error('[PDF Generation] Error details:', JSON.stringify(error, null, 2));
    console.error('[PDF Generation] Chart data:', chartData);
    return '';
  }

  console.log('[PDF Generation] Chart data fetched, parsing...');

  // Parse chart data
  const parsedChartData = typeof chartData.chart_data === 'string'
    ? JSON.parse(chartData.chart_data)
    : chartData.chart_data;

  console.log('[PDF Generation] Chart data parsed:', JSON.stringify(parsedChartData, null, 2).slice(0, 500));

  // Create a standalone HTML page with Recharts loaded from CDN
  const chartHtml = createRechartsHtml(parsedChartData);

  console.log('[PDF Generation] Chart HTML created, length:', chartHtml.length);

  const page = await browser.newPage();

  // Disable web security to allow CDN scripts
  await page.setBypassCSP(true);

  // Listen to console messages from the page
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.error('[PDF Generation - Browser Console Error]:', text);
    } else if (type === 'warning') {
      console.warn('[PDF Generation - Browser Console Warning]:', text);
    } else {
      console.log('[PDF Generation - Browser Console]:', text);
    }
  });

  // Listen to page errors
  page.on('pageerror', error => {
    console.error('[PDF Generation - Page Error]:', error.message);
  });

  try {
    // Set viewport for proper chart rendering
    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 1.5,
    });

    console.log('[PDF Generation] Setting page content...');

    // Set HTML content with longer timeout
    await page.setContent(chartHtml, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('[PDF Generation] Page content set, waiting for render...');

    // Wait for chart to render
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('[PDF Generation] Finding chart wrapper element...');

    // Find the chart wrapper element and screenshot it
    const element = await page.$('.chart-wrapper');

    if (!element) {
      console.error('[PDF Generation] Chart wrapper element not found in page');
      throw new Error('Chart wrapper not found');
    }

    console.log('[PDF Generation] Taking screenshot...');

    // Take screenshot of just the chart wrapper
    const screenshot = await element.screenshot({
      type: 'png',
      omitBackground: false,
    });

    const base64 = Buffer.from(screenshot).toString('base64');
    console.log('[PDF Generation] Chart rendered successfully:', chartId, 'Size:', base64.length);
    return base64;
  } catch (error) {
    console.error('[PDF Generation] Failed to render chart:', chartId);
    console.error('[PDF Generation] Error details:', error);
    return '';
  } finally {
    await page.close();
  }
}

/**
 * Create HTML with pure SVG chart - no external dependencies, no CORS issues
 * This approach is based on the atlas app's proven PDF chart rendering
 */
function createRechartsHtml(chartData: any): string {
  const logoPath = path.join(process.cwd(), 'public', 'valyu.svg');
  const logoSvg = fs.readFileSync(logoPath, 'utf-8');

  const { chartType, title, description, dataSeries } = chartData;
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Generate SVG chart
  const svgChart = generateSVGChart(chartData, colors);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: white;
          padding: 0;
          margin: 0;
        }
        .chart-wrapper {
          background: white;
          border-radius: 8px;
          padding: 24px;
          width: 1100px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        .chart-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
        }
        .chart-description {
          font-size: 12px;
          color: #6b7280;
          max-width: 700px;
        }
        .logo {
          max-width: 60px !important;
          width: 60px !important;
          height: auto !important;
          opacity: 0.8;
        }
        .logo svg {
          max-width: 60px !important;
          width: 60px !important;
          height: auto !important;
        }
      </style>
    </head>
    <body>
      <div class="chart-wrapper">
        <div class="chart-header">
          <div>
            <div class="chart-title">${title || 'Chart'}</div>
            ${description ? `<div class="chart-description">${description}</div>` : ''}
          </div>
          <div class="logo">${logoSvg}</div>
        </div>
        <div class="chart-content">
          ${svgChart}
        </div>
      </div>
    </body>
    </body>
    </html>
  `;
}

/**
 * Generate SVG chart - no external dependencies, renders inline
 * Based on atlas app approach for reliable PDF chart rendering
 */
function generateSVGChart(chartData: any, colors: string[]): string {
  const { chartType, dataSeries, xAxisLabel, yAxisLabel } = chartData;

  const width = 1100;
  const height = 480;
  const padding = { top: 40, right: 60, bottom: 60, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Collect all data points and find min/max
  const allValues: number[] = [];
  const xLabels: string[] = [];
  dataSeries?.forEach((series: any) => {
    series.data?.forEach((point: any) => {
      allValues.push(point.y);
      if (!xLabels.includes(String(point.x))) {
        xLabels.push(String(point.x));
      }
    });
  });

  const maxY = Math.max(...allValues);
  const minY = Math.min(...allValues, 0);
  const yRange = maxY - minY;
  const yScale = chartHeight / yRange;

  // Generate chart based on type
  let chartElements = '';

  if (chartType === 'bar') {
    const barWidth = chartWidth / (xLabels.length * dataSeries.length + xLabels.length);
    const groupWidth = barWidth * dataSeries.length;

    xLabels.forEach((xLabel, xIndex) => {
      dataSeries.forEach((series: any, seriesIndex: number) => {
        const point = series.data.find((p: any) => String(p.x) === xLabel);
        if (point) {
          const barHeight = (point.y - minY) * yScale;
          const x = padding.left + xIndex * (groupWidth + barWidth) + seriesIndex * barWidth;
          const y = padding.top + chartHeight - barHeight;

          chartElements += `
            <rect x="${x}" y="${y}" width="${barWidth * 0.9}" height="${barHeight}"
                  fill="${colors[seriesIndex % colors.length]}" rx="6" ry="6"/>
          `;
        }
      });
    });
  } else if (chartType === 'line' || chartType === 'area') {
    dataSeries?.forEach((series: any, seriesIndex: number) => {
      const points: string[] = [];
      xLabels.forEach((xLabel, xIndex) => {
        const point = series.data.find((p: any) => String(p.x) === xLabel);
        if (point) {
          const x = padding.left + (xIndex / (xLabels.length - 1)) * chartWidth;
          const y = padding.top + chartHeight - (point.y - minY) * yScale;
          points.push(`${x},${y}`);
        }
      });

      const pathData = `M ${points.join(' L ')}`;

      if (chartType === 'area') {
        const areaPath = `${pathData} L ${padding.left + chartWidth},${padding.top + chartHeight} L ${padding.left},${padding.top + chartHeight} Z`;
        chartElements += `
          <path d="${areaPath}" fill="${colors[seriesIndex % colors.length]}" opacity="0.3"/>
        `;
      }

      chartElements += `
        <path d="${pathData}" fill="none" stroke="${colors[seriesIndex % colors.length]}"
              stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      `;

      // Add dots
      points.forEach(point => {
        const [x, y] = point.split(',');
        chartElements += `
          <circle cx="${x}" cy="${y}" r="5" fill="white" stroke="${colors[seriesIndex % colors.length]}" stroke-width="2"/>
        `;
      });
    });
  }

  // Grid lines
  let gridLines = '';
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i;
    gridLines += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" stroke="#e5e7eb" stroke-dasharray="3,3"/>`;
  }

  // Axes
  const axes = `
    <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="#333" stroke-width="2"/>
    <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${padding.left + chartWidth}" y2="${padding.top + chartHeight}" stroke="#333" stroke-width="2"/>
  `;

  // Y-axis labels
  let yLabels = '';
  for (let i = 0; i <= 5; i++) {
    const value = minY + (yRange / 5) * (5 - i);
    const y = padding.top + (chartHeight / 5) * i;
    yLabels += `<text x="${padding.left - 15}" y="${y + 5}" text-anchor="end" fill="#6b7280" font-size="11">${value.toFixed(0)}</text>`;
  }

  // X-axis labels
  let xLabelsHtml = '';
  xLabels.forEach((label, index) => {
    const x = padding.left + (index / (xLabels.length - 1)) * chartWidth;
    xLabelsHtml += `<text x="${x}" y="${padding.top + chartHeight + 30}" text-anchor="middle" fill="#6b7280" font-size="11">${label}</text>`;
  });

  // Legend - centered at bottom
  const legendItemWidth = 200;
  const totalLegendWidth = dataSeries.length * legendItemWidth;
  const legendStartX = (width - totalLegendWidth) / 2;

  let legend = '';
  dataSeries?.forEach((series: any, index: number) => {
    const x = legendStartX + index * legendItemWidth;
    const y = height - 20;
    legend += `
      <rect x="${x}" y="${y - 12}" width="15" height="15" fill="${colors[index % colors.length]}" rx="3"/>
      <text x="${x + 22}" y="${y}" fill="#6b7280" font-size="13" font-weight="500">${series.name}</text>
    `;
  });

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${gridLines}
      ${axes}
      ${chartElements}
      ${yLabels}
      ${xLabelsHtml}
      ${legend}
    </svg>
  `;
}

/**
 * Create HTML for standalone chart rendering
 * This loads the chart via iframe from our live Next.js chart endpoint
 */
function createChartComponentHtml(chartData: any): string {
  // Read logo
  const logoPath = path.join(process.cwd(), 'public', 'valyu.svg');
  const logoSvg = fs.readFileSync(logoPath, 'utf-8');

  // Encode chart data for URL
  const chartDataEncoded = encodeURIComponent(JSON.stringify(chartData));

  // Use localhost or production URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: white;
          padding: 40px;
        }
        .chart-wrapper {
          background: white;
          border-radius: 16px;
          padding: 32px;
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
          justify-center: center;
          background: #f9fafb;
          border-radius: 8px;
          padding: 12px;
        }
        .logo-box svg {
          max-width: 100%;
          max-height: 100%;
        }
        .chart-content {
          min-height: 500px;
        }
        .chart-render {
          width: 100%;
          height: 500px;
        }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/recharts@2.10.3/dist/Recharts.js"></script>
      <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    </head>
    <body>
      <div class="chart-wrapper">
        <div class="header">
          <div class="title-section">
            <div class="title">${chartData.title || 'Chart'}</div>
            <div class="description">${chartData.description || ''}</div>
          </div>
          <div class="logo-box">
            ${logoSvg}
          </div>
        </div>
        <div class="chart-content">
          <div id="chart-root" class="chart-render"></div>
          <script>
            // Render a simple chart representation
            const chartData = ${JSON.stringify(chartData)};
            const root = document.getElementById('chart-root');
            root.innerHTML = '<div style="background: #f3f4f6; border-radius: 8px; padding: 40px; text-align: center; height: 100%;"><h3 style="color: #374151; margin-bottom: 16px;">' + (chartData.title || 'Chart') + '</h3><p style="color: #6b7280; font-size: 14px;">Chart Type: ' + (chartData.chartType || chartData.type || 'Unknown') + '</p><p style="color: #6b7280; font-size: 14px; margin-top: 8px;">' + ((chartData.dataSeries?.length || 0) + ' data series') + '</p></div>';
          </script>
        </div>
      </div>
    </body>
    </html>
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
