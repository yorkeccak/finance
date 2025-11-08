import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ImageResponse } from 'next/og';

/**
 * GET /api/charts/[chartId]/render
 * Renders a chart as HTML for Puppeteer screenshots
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chartId: string }> }
) {
  try {
    const { chartId } = await params;

    const supabase = await createClient();

    // Fetch chart data
    const { data: chartData, error } = await supabase
      .from('charts')
      .select('chart_data')
      .eq('id', chartId)
      .single();

    if (error || !chartData) {
      return new NextResponse('Chart not found', { status: 404 });
    }

    // Parse chart data
    const parsedChartData = typeof chartData.chart_data === 'string'
      ? JSON.parse(chartData.chart_data)
      : chartData.chart_data;

    // Return HTML page with chart
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body {
              margin: 0;
              padding: 40px;
              background: white;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            .chart-container {
              max-width: 1200px;
              margin: 0 auto;
              background: white;
              border-radius: 12px;
              padding: 32px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .chart-header {
              margin-bottom: 24px;
              padding-bottom: 16px;
              border-bottom: 1px solid #e5e7eb;
            }
            .chart-title {
              font-size: 24px;
              font-weight: 600;
              color: #111827;
              margin-bottom: 8px;
            }
            .chart-description {
              font-size: 14px;
              color: #6b7280;
            }
            .chart-placeholder {
              width: 100%;
              height: 400px;
              background: #f3f4f6;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;
              gap: 12px;
            }
            .placeholder-title {
              font-size: 18px;
              font-weight: 600;
              color: #374151;
            }
            .placeholder-subtitle {
              font-size: 14px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="chart-container">
            <div class="chart-header">
              <div class="chart-title">${parsedChartData.title || 'Chart'}</div>
              ${parsedChartData.description ? `<div class="chart-description">${parsedChartData.description}</div>` : ''}
            </div>
            <div class="chart-placeholder">
              <div class="placeholder-title">${parsedChartData.chartType || parsedChartData.type || 'Chart'}</div>
              <div class="placeholder-subtitle">
                ${parsedChartData.dataSeries?.length || 0} data series •
                ${parsedChartData.dataSeries?.[0]?.data?.length || 0} data points
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error rendering chart:', error);
    return new NextResponse('Error rendering chart', { status: 500 });
  }
}
